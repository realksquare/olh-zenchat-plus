defmodule ZenServer.MomentSweeper do
  use GenServer
  require Logger

  alias ZenServer.Repo
  alias ZenServer.Schema.{Moment, MomentView}
  import Ecto.Query

  @interval_ms 3_600_000

  def start_link(_opts), do: GenServer.start_link(__MODULE__, %{}, name: __MODULE__)

  def init(state) do
    schedule_sweep()
    {:ok, state}
  end

  def handle_info(:sweep, state) do
    sweep_expired()
    schedule_sweep()
    {:noreply, state}
  end

  defp sweep_expired do
    try do
      now = DateTime.utc_now()
      expired_ids = from(m in Moment, where: m.expires_at <= ^now, select: m.id) |> Repo.all()
      if length(expired_ids) > 0 do
        from(v in MomentView, where: v.moment_id in ^expired_ids) |> Repo.delete_all()
        {count, _} = from(m in Moment, where: m.id in ^expired_ids) |> Repo.delete_all()
        Logger.info("MomentSweeper: deleted #{count} expired moment(s)")
      end
    rescue
      e -> Logger.warning("MomentSweeper: skipped sweep (database might not be migrated yet)")
    end
  end

  defp schedule_sweep, do: Process.send_after(self(), :sweep, @interval_ms)
end
