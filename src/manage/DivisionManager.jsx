using System.Net;
using Azure;
using Azure.Data.Tables;
using GameSwap.Functions.Storage;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace GameSwap.Functions.Functions;

public class DivisionsFunctions
{
    private readonly TableServiceClient _svc;
    private readonly ILogger _log;

    private const string TableName = "Divisions";
    private const string MembershipsTableName = "GameSwapMemberships";

    public DivisionsFunctions(ILoggerFactory lf, TableServiceClient tableServiceClient)
    {
        _log = lf.CreateLogger<DivisionsFunctions>();
        _svc = tableServiceClient;
    }

    public record DivisionDto(string id, string name, string code, bool isActive);
    public record CreateReq(string? name, string? code, bool? isActive);
    public record UpdateReq(string? name, string? code, bool? isActive);

    private static string Slug(string s)
    {
        s = (s ?? "").Trim().ToLowerInvariant();
        var chars = s.Select(ch => char.IsLetterOrDigit(ch) ? ch : '-').ToArray();
        var x = new string(chars);
        while (x.Contains("--")) x = x.Replace("--", "-");
        return x.Trim('-');
    }

    private static string DivPk(string leagueId) => $"DIV#{leagueId}";

    [Function("GetDivisions")]
    public async Task<HttpResponseData> Get(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "divisions")] HttpRequestData req)
    {
        string leagueId;
        try
        {
            leagueId = ApiGuards.RequireLeagueId(req);
        }
        catch (Exception ex)
        {
            return await Err(req, ex.Message, HttpStatusCode.BadRequest);
        }

        // Membership gate
        var me = IdentityUtil.GetMe(req);
        var isMember = await ApiGuards.IsMemberAsync(_svc, me.UserId, leagueId);
        if (!isMember)
            return await Err(req, "Forbidden", HttpStatusCode.Forbidden);

        var pk = DivPk(leagueId);

        var table = _svc.GetTableClient(TableName);
        await table.CreateIfNotExistsAsync();

        var list = new List<DivisionDto>();
        await foreach (var e in table.QueryAsync<TableEntity>(x => x.PartitionKey == pk))
        {
            var id = e.RowKey;
            var name = e.GetString("Name") ?? "";
            var code = e.GetString("Code") ?? id;
            var isActive = e.GetBoolean("IsActive") ?? true;

            list.Add(new DivisionDto(id, name, code, isActive));
        }

        var res = req.CreateResponse(HttpStatusCode.OK);
        await res.WriteAsJsonAsync(list.OrderBy(x => x.code));
        return res;
    }

    [Function("CreateDivision")]
    public async Task<HttpResponseData> Create(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "divisions")] HttpRequestData req)
    {
        string leagueId;
        try
        {
            leagueId = ApiGuards.RequireLeagueId(req);
        }
        catch (Exception ex)
        {
            return await Err(req, ex.Message, HttpStatusCode.BadRequest);
        }

        // Membership gate (any member can create for now)
        var me = IdentityUtil.GetMe(req);
        var isMember = await ApiGuards.IsMemberAsync(_svc, me.UserId, leagueId);
        if (!isMember)
            return await Err(req, "Forbidden", HttpStatusCode.Forbidden);

        CreateReq? body;
        try
        {
            body = await req.ReadFromJsonAsync<CreateReq>();
        }
        catch
        {
            return await Err(req, "Invalid JSON body", HttpStatusCode.BadRequest);
        }

        var name = (body?.name ?? "").Trim();
        var code = (body?.code ?? "").Trim();

        if (string.IsNullOrWhiteSpace(name))
            return await Err(req, "name is required", HttpStatusCode.BadRequest);

        if (string.IsNullOrWhiteSpace(code))
            code = Slug(name);

        if (string.IsNullOrWhiteSpace(code))
            return await Err(req, "code is required", HttpStatusCode.BadRequest);

        var pk = DivPk(leagueId);

        var table = _svc.GetTableClient(TableName);
        await table.CreateIfNotExistsAsync();

        var now = DateTimeOffset.UtcNow;

        var entity = new TableEntity(pk, code)
        {
            ["LeagueId"] = leagueId,
            ["Name"] = name,
            ["Code"] = code,
            ["IsActive"] = body?.isActive ?? true,
            ["UpdatedUtc"] = now,
            ["LastUpdatedUtc"] = now
        };

        try
        {
            await table.AddEntityAsync(entity);
        }
        catch (RequestFailedException ex) when (ex.Status == 409)
        {
            return await Err(req, $"division code already exists: {code}", HttpStatusCode.Conflict);
        }

        var res = req.CreateResponse(HttpStatusCode.Created);
        await res.WriteAsJsonAsync(new DivisionDto(code, name, code, (bool)entity["IsActive"]));
        return res;
    }

    [Function("UpdateDivision")]
    public async Task<HttpResponseData> Update(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "divisions/{id}")] HttpRequestData req,
        string id)
    {
        string leagueId;
        try
        {
            leagueId = ApiGuards.RequireLeagueId(req);
        }
        catch (Exception ex)
        {
            return await Err(req, ex.Message, HttpStatusCode.BadRequest);
        }

        // Membership gate (any member can update for now)
        var me = IdentityUtil.GetMe(req);
        var isMember = await ApiGuards.IsMemberAsync(_svc, me.UserId, leagueId);
        if (!isMember)
            return await Err(req, "Forbidden", HttpStatusCode.Forbidden);

        UpdateReq? body;
        try
        {
            body = await req.ReadFromJsonAsync<UpdateReq>();
        }
        catch
        {
            return await Err(req, "Invalid JSON body", HttpStatusCode.BadRequest);
        }

        var name = (body?.name ?? "").Trim();
        var code = (body?.code ?? "").Trim();

        if (string.IsNullOrWhiteSpace(name))
            return await Err(req, "name is required", HttpStatusCode.BadRequest);

        // Don’t allow code/RowKey changes
        if (!string.IsNullOrWhiteSpace(code) && !string.Equals(code, id, StringComparison.OrdinalIgnoreCase))
            return await Err(req, "changing code is not supported (code must match id)", HttpStatusCode.BadRequest);

        var pk = DivPk(leagueId);

        var table = _svc.GetTableClient(TableName);
        await table.CreateIfNotExistsAsync();

        TableEntity existing;
        try
        {
            existing = (await table.GetEntityAsync<TableEntity>(pk, id)).Value;
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            return await Err(req, $"division not found: {id}", HttpStatusCode.NotFound);
        }

        var now = DateTimeOffset.UtcNow;

        existing["Name"] = name;
        existing["Code"] = id;
        existing["IsActive"] = body?.isActive ?? (existing.GetBoolean("IsActive") ?? true);
        existing["UpdatedUtc"] = now;
        existing["LastUpdatedUtc"] = now;

        await table.UpdateEntityAsync(existing, ETag.All, TableUpdateMode.Merge);

        var res = req.CreateResponse(HttpStatusCode.OK);
        await res.WriteAsJsonAsync(new DivisionDto(id, name, id, (bool)existing["IsActive"]));
        return res;
    }

    private static async Task<HttpResponseData> Err(HttpRequestData req, string msg, HttpStatusCode code)
    {
        var res = req.CreateResponse(code);
        await res.WriteAsJsonAsync(new { error = msg });
        return res;
    }
}
