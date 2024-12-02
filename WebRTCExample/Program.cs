using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using WebRTCExample;

var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.UseWebSockets();

app.Use(async (context, next) =>
{
    // Ignore all other requests that are not calling /ws
    if (context.Request.Path != "/ws")
    {
        await next();
        return;
    }

    // Reject requests that are not web socket requests
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
        return;
    }

    var socket = await context.WebSockets.AcceptWebSocketAsync();
    var clientId = Guid.NewGuid().ToString();
    Context.Clients.TryAdd(clientId, socket);

    // Notify all clients that someone connected
    var connected = new ClientConnectionInfo(true);
    string json = JsonSerializer.Serialize(connected);
    await Context.NotifyAllOtherClients(clientId, JsonSerializer.Serialize(connected));

    var buffer = new byte[1024 * 8];
    WebSocketReceiveResult result = null;

    do
    {
        try
        {
            result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            if (result.MessageType == WebSocketMessageType.Text)
            {
                var message = Encoding.UTF8.GetString(buffer, 0, result.Count);

                Console.WriteLine($"Received: {message}");

                await Context.NotifyAllOtherClients(clientId, message);
            }
        }
        catch
        {
            break;
        }
    } while (!result.CloseStatus.HasValue);

    // User has disconnected, remove them from our dictionary
    Context.Clients.TryRemove(clientId, out _);
    // And close the socket connection
    await socket.CloseAsync(result.CloseStatus.Value, result.CloseStatusDescription, CancellationToken.None);

    // Notify all clients that someone disconnected
    var disconnected = new ClientConnectionInfo(false);
    await Context.NotifyAllOtherClients(clientId, JsonSerializer.Serialize(disconnected));
});

app.Run();