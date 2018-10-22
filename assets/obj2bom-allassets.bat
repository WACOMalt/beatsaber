@echo off
for %%o in (*.obj) do obj2bom.exe "%%~no.bom" "%%~no.obj"