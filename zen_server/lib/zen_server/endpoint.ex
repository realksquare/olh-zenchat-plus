defmodule ZenServer.Endpoint do
  use Phoenix.Endpoint, otp_app: :zen_server

  socket "/socket", ZenServer.UserSocket,
    websocket: [
      timeout: 45_000,
      check_origin: false,
      transport_log: false
    ],
    longpoll: false

  plug CORSPlug,
    origin: Application.compile_env(:zen_server, :allowed_origins, ["*"]),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    headers: ["Content-Type", "Authorization", "Accept"]

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]
  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Jason,
    length: 10_485_760

  plug Plug.MethodOverride
  plug Plug.Head
  plug ZenServer.Router
end
