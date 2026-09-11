' ═══════════════════════════════════════════════════════
'  J.A.R.V.I.S — Start with Windows (Background Mode) — v2 error-safe
'  Double-click karo: JARVIS ab Windows start hote hi
'  background mein (minimized console) chale gi.
'
'  Remove karne ke liye: Win+R → shell:startup
'  → "J.A.R.V.I.S.lnk" delete kar do.
' ═══════════════════════════════════════════════════════
Option Explicit

Dim sh, fso, dir, sc, startupPath, ans
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Is script ka folder = jarvis folder
dir = fso.GetParentFolderName(WScript.ScriptFullName)

' Startup folder shortcut (Windows start par automatically chalta hai)
startupPath = sh.SpecialFolders("Startup") & "\J.A.R.V.I.S.lnk"

On Error Resume Next
Set sc = sh.CreateShortcut(startupPath)
sc.TargetPath = dir & "\start.bat"
sc.WorkingDirectory = dir
sc.Description = "J.A.R.V.I.S - Cyberpunk Voice Assistant (background, auto-start)"
sc.WindowStyle = 7            ' console minimized — background server (login par koi window nahi)
sc.IconLocation = sh.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\cmd.exe,0"
sc.Save

If Err.Number <> 0 Then
    MsgBox "Startup shortcut nahi ban paya!" & vbCrLf & vbCrLf & _
           "Error: " & Err.Description & " (" & Err.Number & ")" & vbCrLf & _
           "Target: " & startupPath & vbCrLf & vbCrLf & _
           "Fix: is folder ko normal jagah rakho (Desktop/Downloads) aur dobara try karo.", _
           48, "J.A.R.V.I.S - ERROR"
    WScript.Quit 1
End If
On Error GoTo 0
Set sc = Nothing

ans = MsgBox("JARVIS ab Windows start hote hi background mein chale gi." & vbCrLf & _
             startupPath & vbCrLf & vbCrLf & _
             "Abhi test karein (start.bat minimize hoke chalega)?", 36, "J.A.R.V.I.S")

If ans = vbYes Then
    sh.Run """" & dir & "\start.bat""", 7, False
End If

Set fso = Nothing
Set sh = Nothing
