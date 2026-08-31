' ════════════════════════════════════════════════════════════
' 🚀 AUTO START GIT SERVER (Sem janela CMD)
' ════════════════════════════════════════════════════════════
' Este script inicia o servidor Git sem mostrar janela do CMD

Set WshShell = CreateObject("WScript.Shell")

' Executar o servidor sem mostrar janela (0 = oculto)
WshShell.Run "cmd /c cd /d D:\Cursor\Sites && node git-server.js", 0, False

' Aguardar 2 segundos
WScript.Sleep 2000

' Mostrar mensagem de sucesso
WshShell.Popup "✅ Servidor Git iniciado!" & vbCrLf & vbCrLf & "🟢 Servidor rodando em segundo plano", 3, "Git Server", 64

Set WshShell = Nothing

