Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = oWS.SpecialFolders("Desktop") & "\لوحة تحكم المشاريع.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "c:\Users\Computec\Downloads\New folder (10)\dashboard\start-app.bat"
oLink.WorkingDirectory = "c:\Users\Computec\Downloads\New folder (10)\dashboard"
oLink.IconLocation = "shell32.dll,220"
oLink.Save
