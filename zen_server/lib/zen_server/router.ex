defmodule ZenServer.Router do
  use Phoenix.Router, helpers: false
  import Plug.Conn

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :authenticated do
    plug :accepts, ["json"]
    plug ZenServer.Plugs.Auth
  end

  scope "/", ZenServer do
    pipe_through :api

    get "/", PageController, :index
    get "/api/health", PageController, :health
  end

  scope "/api/auth", ZenServer do
    pipe_through :api

    post "/register", AuthController, :register
    post "/login", AuthController, :login
  end

  scope "/api/auth", ZenServer do
    pipe_through :authenticated

    get "/me", AuthController, :me
    post "/logout", AuthController, :logout
    put "/me", AuthController, :update
    post "/contacts/:target_id", AuthController, :add_contact
    delete "/contacts/:target_id", AuthController, :remove_contact
  end

  scope "/api/messages", ZenServer do
    pipe_through :api

    get "/sign-upload", MessageController, :sign_upload
    get "/health", MessageController, :health
  end

  scope "/api", ZenServer do
    pipe_through :authenticated

    get "/chats", ChatController, :index
    post "/chats", ChatController, :create
    get "/chats/users", ChatController, :search_users
    get "/chats/:chat_id", ChatController, :show
    delete "/chats/:chat_id", ChatController, :delete
    post "/chats/:chat_id/pin", ChatController, :pin
    post "/chats/:chat_id/unpin", ChatController, :unpin

    get "/messages/:chat_id", MessageController, :index
    post "/messages/:chat_id", MessageController, :create
    post "/messages/:chat_id/upload", MessageController, :upload
    patch "/messages/:chat_id/read", MessageController, :mark_read
    post "/messages/:message_id/star", MessageController, :star
    post "/messages/:message_id/unstar", MessageController, :unstar
    post "/messages/:message_id/view", MessageController, :view_once
    post "/messages/:message_id/delivered", MessageController, :delivered
    delete "/messages/:message_id", MessageController, :delete

    get "/moments", MomentController, :index
    post "/moments", MomentController, :create
    post "/moments/:id/view", MomentController, :view
    delete "/moments/:id", MomentController, :delete

    get "/music/search", MusicController, :search
  end

  scope "/api/admin", ZenServer do
    pipe_through :authenticated

    get "/stats", AdminController, :stats
    get "/users", AdminController, :users
    post "/verify/:user_id", AdminController, :toggle_verify
    post "/role/:user_id", AdminController, :update_role
    post "/suspend/:user_id", AdminController, :toggle_suspend
    delete "/users/:user_id", AdminController, :delete_user
  end
end
