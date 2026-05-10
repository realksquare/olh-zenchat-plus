defmodule ZenServer.PageController do
  use Phoenix.Controller, formats: [:json]

  def index(conn, _params) do
    json(conn, %{status: "alive", message: "ZenChat+ Server is running", timestamp: DateTime.utc_now()})
  end

  def health(conn, _params) do
    json(conn, %{status: "ok", uptime: :erlang.statistics(:wall_clock) |> elem(0)})
  end
end
