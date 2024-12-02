using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;

namespace WebRTCExample
{
    public static class Context
    {
        // Dictionary to keep track of connected WebSocket clients
        public static ConcurrentDictionary<string, WebSocket> Clients = new ConcurrentDictionary<string, WebSocket>();

        public static async Task NotifyAllOtherClients(string clientId, string message)
        {
            // Relay message to other clients
            foreach (var client in Clients)
            {
                // Do not notify the client that is invoking this request
                if (client.Key == clientId)
                    continue;

                // If the socket is not open, ignore it
                if (client.Value.State != WebSocketState.Open)
                    continue;

                // Send to client
                await client.Value.SendAsync(
                        new ArraySegment<byte>(Encoding.UTF8.GetBytes(message)),
                        WebSocketMessageType.Text,
                        true,
                        CancellationToken.None);
            }
        }
    }
}
