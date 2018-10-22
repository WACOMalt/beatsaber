@ECHO OFF

SET file=%1
FOR %%i IN ("%file%") DO CALL :ExtractFileData %%~di %%~pi %%~ni %%~xi
GOTO End

:ExtractFileData
SET filepath=%1%2
SET filename=%3
SET fileextension=%4
REM ECHO %filepath%%filename%%fileextension%
obj2bom %filepath%%filename%.bom %filepath%%filename%.obj
PAUSE
GOTO End

:End