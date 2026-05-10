defmodule ZenServer.Presence do
  use GenServer

  @name __MODULE__

  def start_link(_opts), do: GenServer.start_link(__MODULE__, %{}, name: @name)

  def init(_), do: {:ok, %{users: %{}, disconnect_timers: %{}}}

  def online?(user_id), do: GenServer.call(@name, {:online?, user_id})
  def get_sockets(user_id), do: GenServer.call(@name, {:get_sockets, user_id})
  def all_online, do: GenServer.call(@name, :all_online)

  def user_connected(user_id, socket_id, device_type),
    do: GenServer.cast(@name, {:connect, user_id, socket_id, device_type})

  def user_disconnected(user_id, socket_id),
    do: GenServer.cast(@name, {:disconnect, user_id, socket_id})

  def cancel_disconnect_timer(user_id),
    do: GenServer.cast(@name, {:cancel_timer, user_id})

  def handle_call({:online?, user_id}, _from, state) do
    is_online = Map.has_key?(state.users, user_id) && map_size(state.users[user_id]) > 0
    {:reply, is_online, state}
  end

  def handle_call({:get_sockets, user_id}, _from, state) do
    sockets = Map.get(state.users, user_id, %{})
    {:reply, sockets, state}
  end

  def handle_call(:all_online, _from, state) do
    {:reply, Map.keys(state.users), state}
  end

  def handle_cast({:connect, user_id, socket_id, device_type}, state) do
    users = Map.update(state.users, user_id, %{socket_id => device_type}, fn socks ->
      Map.put(socks, socket_id, device_type)
    end)
    {:noreply, %{state | users: users}}
  end

  def handle_cast({:disconnect, user_id, socket_id}, state) do
    users = Map.update(state.users, user_id, %{}, fn socks ->
      Map.delete(socks, socket_id)
    end)
    users = if map_size(Map.get(users, user_id, %{})) == 0 do
      Map.delete(users, user_id)
    else
      users
    end
    {:noreply, %{state | users: users}}
  end

  def handle_cast({:cancel_timer, user_id}, state) do
    if timer_ref = Map.get(state.disconnect_timers, user_id) do
      Process.cancel_timer(timer_ref)
    end
    {:noreply, %{state | disconnect_timers: Map.delete(state.disconnect_timers, user_id)}}
  end
end
