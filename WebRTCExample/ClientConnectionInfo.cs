using System.Text.Json.Serialization;

namespace WebRTCExample
{
    public class ClientConnectionInfo
    {
        public ClientConnectionInfo() { }
        public ClientConnectionInfo(bool connected) { IsConnected = connected; }

        [JsonPropertyName("type")]
        public string Type { get; private set; } = "connection";
        [JsonPropertyName("isConnected")]
        public bool IsConnected { get; set; }
    }
}
