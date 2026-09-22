$voice = New-Object -ComObject SAPI.SpVoice
Write-Host "Voice: $($voice.Voice.GetDescription())"
$stream = New-Object -ComObject SAPI.SpFileStream
$stream.Open("C:\Users\User\.gemini\antigravity-ide\brain\abb6692f-a262-4deb-90dd-a418055b4949\test.wav", 3)
$voice.AudioOutputStream = $stream
$voice.Speak("Radiance Production Reporting Version 1.0 Walkthrough Demo.")
$stream.Close()
Write-Host "Generated test.wav successfully!"
