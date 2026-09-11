' ═══════════════════════════════════════════════════════
'  J.A.R.V.I.S — Desktop Shortcut Creator (v2 — error-safe)
'  Double-click karo: Desktop par "J.A.R.V.I.S" shortcut banega
'  Agar kuch fail ho toh clear error message dikhega.
' ═══════════════════════════════════════════════════════
Option Explicit

Dim sh, fso, dir, sc, shortcutPath, ans
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Is script ka folder = jarvis folder
dir = fso.GetParentFolderName(WScript.ScriptFullName)

' Desktop shortcut path
shortcutPath = sh.SpecialFolders("Desktop") & "\J.A.R.V.I.S.lnk"

On Error Resume Next
Set sc = sh.CreateShortcut(shortcutPath)
sc.TargetPath = dir & "\start.bat"
sc.WorkingDirectory = dir
sc.Description = "J.A.R.V.I.S - Cyberpunk Voice Assistant (local)"
sc.WindowStyle = 1            ' console NORMAL dikhega (1) — server status/error dekhne ke liye
sc.IconLocation = sh.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\cmd.exe,0"
sc.Save

If Err.Number <> 0 Then
    MsgBox "Shortcut nahi ban paya!" & vbCrLf & vbCrLf & _
           "Error: " & Err.Description & " (" & Err.Number & ")" & vbCrLf & _
           "Target: " & shortcutPath & vbCrLf & vbCrLf & _
           "Fix: is folder ko Desktop ya Downloads jaise normal jagah rakho," & vbCrLf & _
           "phir dobara double-click karo. Agar antivirus poochhe toh Allow karo.", _
           48, "J.A.R.V.I.S - ERROR"
    WScript.Quit 1
End If
On Error GoTo 0
Set sc = Nothing

ans = MsgBox("Shortcut ban gaya!" & vbCrLf & vbCrLf & _
             shortcutPath & vbCrLf & vbCrLf & _
             "Abhi launch karein?", 36, "J.A.R.V.I.S")

If ans = vbYes Then
    sh.Run """" & dir & "\start.bat""", 1, False
End If

Set fso = Nothing
Set sh = Nothing
