defmodule ZenServer.Repo do
  use Ecto.Repo,
    otp_app: :zen_server,
    adapter: Ecto.Adapters.Postgres
end
