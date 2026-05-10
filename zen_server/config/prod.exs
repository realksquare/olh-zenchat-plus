import Config

config :zen_server, ZenServer.Endpoint,
  server: true,
  check_origin: true

config :logger, level: :info
