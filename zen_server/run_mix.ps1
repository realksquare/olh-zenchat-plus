$env:PATH = "D:\elixir-install\elixir28\bin;D:\erlang\bin;" + $env:PATH
$env:ERTS_BIN = "D:\erlang\bin\"
cd D:\ZenChat+\zen_server
& 'mix.bat' deps.get
& 'mix.bat' phx.gen.secret > secret.txt
