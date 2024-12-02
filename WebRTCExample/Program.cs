using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

// Dictionary to keep track of connected WebSocket clients
var clients = new ConcurrentDictionary<string, WebSocket>();

app.UseWebSockets();

app.Use(async (context, next) =>
{
    if (context.Request.Path == "/ws")
    {
        if (context.WebSockets.IsWebSocketRequest)
        {
            var socket = await context.WebSockets.AcceptWebSocketAsync();
            var clientId = Guid.NewGuid().ToString();
            clients.TryAdd(clientId, socket);

            Console.WriteLine($"Client connected: {clientId}");

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
                        await Task.Delay(500);
                        Console.WriteLine($"Received: {message}");

                        // Relay message to other clients
                        foreach (var client in clients)
                        {
                            if (client.Key != clientId && client.Value.State == WebSocketState.Open)
                            {
                                await client.Value.SendAsync(
                                    new ArraySegment<byte>(Encoding.UTF8.GetBytes(message)),
                                    WebSocketMessageType.Text,
                                    true,
                                    CancellationToken.None);
                            }
                        }
                    }
                }
                catch
                {
                    break;
                }
            } while (!result.CloseStatus.HasValue);

            clients.TryRemove(clientId, out _);
            await socket.CloseAsync(result.CloseStatus.Value, result.CloseStatusDescription, CancellationToken.None);
            Console.WriteLine($"Client disconnected: {clientId}");
        }
        else
        {
            context.Response.StatusCode = 400;
        }
    }
    else
    {
        await next();
    }
});

app.Run();