# Voice Over Generator for Radiance Walkthrough Demo Video
$scenes = @(
    @{
        id = "scene01"
        title = "Scene 1: System Launch & Architecture"
        script = "Welcome to the official training and walkthrough demonstration for the Radiance Polymers Digital Production Reporting System, Version 1.0. This application is purpose-built and fully hardened for the 21-day live shop-floor pilot on injection moulding machine MC03. Designed specifically for industrial shop-floor tablets in fixed landscape orientation, the system requires no complex login or credentials for floor operators, allowing immediate operational access. Notice the prominent green live trial banner anchored across the top of the interface, clearly displaying the active trial status, machine MC03 lock, and real-time day counter. All production data captured during this session is stored securely on the local device with zero data loss risk, even during network disconnects."
    },
    @{
        id = "scene02"
        title = "Scene 2: Shift Setup & Machine Selection"
        script = "To initiate a new operational production shift, tap the New Shift button located on the navigation header. The Shift Setup window opens. Machine MC03, a KraussMaffei 250 ton press, is pre-configured and locked as the designated pilot work center. Notice that when MC03 is active, the part selection catalog is strictly scoped to show only the three parts authorized and tooling-mapped to this machine: Part F53200000A, Part 5036677, and Part 5012394. This strict validation gate guarantees from the very first tap that operators cannot accidentally select an incorrect part or an unmapped machine, eliminating clerical errors at the source."
    },
    @{
        id = "scene03"
        title = "Scene 3: Operator Identification"
        script = "Next, we observe the Operator Name field. Traceability is paramount on the shop floor. The operator name input is configured as a mandatory free-text field, allowing seamless rotation of floor personnel without cumbersome administrative account creation. For this trial shift, the operator enters the name Ramesh. The validation engine immediately verifies that the field is non-empty. This captured operator name will be permanently stamped on every hourly entry, the shift closure record, the audit trail, and all executive email dispatches for 100 percent shop floor accountability."
    },
    @{
        id = "scene04"
        title = "Scene 4: Shift Start & Initial Counter Reading"
        script = "We now finalize the shift setup parameters. Select Shift A, operating from 8 AM to 4 PM. In the Supervisor dropdown, select Mr. Lokesh, one of our designated pilot supervisors. Select active part number F53200000A. The system instantly cross-references the verified Master Data to retrieve the baseline cycle time of 28 seconds and active cavity count of 2. Finally, operator Ramesh inspects the physical machine stroke counter on MC03 and inputs the starting reading: 124,500. Upon tapping Start Shift, the Production Console activates, establishing the baseline reference point for all subsequent production telemetry."
    },
    @{
        id = "scene05"
        title = "Scene 5: Hourly Production Entry & Capacity Limit Validation"
        script = "During production, output is logged on an hourly basis. Operator Ramesh taps the Enter Production button for Hour 1, spanning 9 AM to 10 AM. Ramesh enters a gross production quantity of 180 pieces, followed by the current machine counter reading of 124,680. Behind the scenes, the built-in mathematical validation engine performs an immediate check against theoretical maximum capacity based on cycle time and active cavities. If an entered quantity exceeds physical possibility, the entry is automatically blocked with an alert in both English and Hindi. With valid data provided, Ramesh taps Save, and the shift running totals update instantaneously."
    },
    @{
        id = "scene06"
        title = "Scene 6: Defect & Rejection Entry"
        script = "Quality control is integrated directly into the operator workflow. To log non-conforming parts, operator Ramesh taps the Rejections button on the console. A comprehensive rejection logging modal appears, pre-loaded with standardized defect categories including Short Shot, Sink Mark, Flash, Flow Marks, Silver Streaks, and Warpage. Ramesh selects Short Shot from the list and enters a quantity of 5 pieces. Upon tapping Add Rejection, the console automatically computes the accepted quantity: 180 gross pieces minus 5 rejected pieces equals 175 accepted units. Manual arithmetic is completely eliminated, preventing tally errors on the floor."
    },
    @{
        id = "scene07"
        title = "Scene 7: Downtime & Delay Logging"
        script = "Whenever the injection moulding machine stops for any reason, downtime must be accounted for. Ramesh taps the Downtime button. The downtime logging interface displays standardized reason codes, categorized into Planned Stoppages and Unplanned Breakdowns. Ramesh selects Mould Maintenance and enters a duration of 30 minutes. An optional notes field allows floor operators to provide concise diagnostic comments. Tapping Save logs the downtime into the shift ledger, instantly updating the cumulative shift downtime counter and enabling root-cause analysis for plant management."
    },
    @{
        id = "scene08"
        title = "Scene 8: Part Change & Multi-Session Tracking"
        script = "Now let us observe a mid-shift mould and part change. Machine MC03 transitions from Part F53200000A to Part 5036677. Operator Ramesh taps the Part Change button. In accordance with plant standards, the part number serves directly as the mould and tool identifier, with no separate mould numbering hierarchy needed. Ramesh enters the closing stroke counter for the first part session and selects the incoming part 5036677. The system cleanly terminates Session 1 and initializes Session 2, preserving segregated production counts, cycle times, and scrap records for both parts under the same unified shift report."
    },
    @{
        id = "scene09"
        title = "Scene 9: End of Shift Counter Reconciliation & Closure"
        script = "At 16:00, Shift A concludes. Operator Ramesh initiates the Shift Closure procedure by tapping Close Shift. Ramesh enters the final machine counter reading: 125,150. The reconciliation engine immediately verifies the mathematical balance between the machine stroke counter difference and the sum of all hourly production entries. The variance is verified at exactly zero point zero percent. Raw material consumption is calculated automatically from part and runner weights, totaling 87.4 kilograms of polymer resin. Ramesh submits the report, which transitions to Submitted status, ready for supervisor sign-off."
    },
    @{
        id = "scene10"
        title = "Scene 10: Supervisor Review & Digital Approval"
        script = "Pilot Supervisor Mr. Lokesh now logs into the console to conduct the official review. Mr. Lokesh opens the Shift Summary Drawer to inspect every aspect of Shift A: gross production, verified accepted count, total scrap breakdown by defect code, recorded downtime minutes, and raw material utilization. Confirming that digital figures match physical floor tallies with 100 percent accuracy, Mr. Lokesh clicks the Approve Shift button. This action permanently locks the report with a cryptographic timestamp and supervisor identity stamp, preventing any post-approval tampering."
    },
    @{
        id = "scene11"
        title = "Scene 11: Standardized Multi-Tab Excel Export Engine"
        script = "Upon supervisor approval, official reporting deliverables are generated on demand. In the Shift Reports directory, supervisor Mr. Lokesh taps the Export Excel button. Within seconds, the system compiles a complete multi-sheet Microsoft Excel workbook. The exported file contains distinct dedicated tabs for Shift Overview, Hourly Production Log, Rejection Itemization, Downtime Log, and Material Reconciliation, formatted strictly to Radiance Polymers corporate standards and ready for ERP or finance ingestion."
    },
    @{
        id = "scene12"
        title = "Scene 12: Official Signed Production PDF Export"
        script = "Next, Mr. Lokesh taps the Export PDF button. The built-in high-resolution PDF rendering engine generates an official, print-ready shift certification report. The PDF includes the corporate Radiance Polymers header, production scorecard, defect Pareto table, and formal signature endorsement blocks for Pilot Supervisor Mr. Lokesh and Production Manager S. N. Sharma. The file is downloaded automatically to the device storage for immediate distribution or hard-copy archiving."
    },
    @{
        id = "scene13"
        title = "Scene 13: Automated Daily Production Summary Email"
        script = "Simultaneously with supervisor approval, the automated email dispatch service triggers seamlessly in the background. The Daily Production Summary Email is routed instantly to the plant leadership distribution list, including the Production Manager, Quality Head, and Plant Operations Director. The dispatch payload includes key shift metrics directly in the email body, with both the standardized Excel workbook and certified PDF report attached automatically, requiring zero manual emailing effort from the shop floor."
    },
    @{
        id = "scene14"
        title = "Scene 14: Backup Verification & Live Trial Readiness"
        script = "Finally, we examine the Trial Go-Live Dashboard. The Backup Telemetry panel confirms that all shift transactions are fully replicated across local storage, IndexedDB, and pending cloud sync queues. The Day Counter proudly advances to Day 1 of 21 for Machine MC03. All five plant-wide rollout decision gates are tracked continuously with 100 percent data accuracy. With master data imported, full dry run certified, and Android APK deployed, Version 1.0 is officially feature frozen, fully validated, and cleared for live shop-floor execution. Ready for MC03 Live Trial."
    }
)

$outDir = "scratch\walkthrough_project\audio"
$voice = New-Object -ComObject SAPI.SpVoice
# Set deliberate, clear training pace (-1 rate)
$voice.Rate = -1
$voice.Volume = 100

Write-Host "Synthesizing voice-over narration for $($scenes.Count) scenes..."

foreach ($scene in $scenes) {
    $wavPath = Join-Path $outDir "$($scene.id).wav"
    Write-Host "Generating $($scene.title)..."
    $stream = New-Object -ComObject SAPI.SpFileStream
    # 3 = SSFMCreateForWrite
    $stream.Open($wavPath, 3)
    $voice.AudioOutputStream = $stream
    $voice.Speak($scene.script)
    $stream.Close()
    
    # Get audio duration using ffmpeg
    $ffOut = & ffmpeg -i $wavPath 2>&1 | Select-String "Duration"
    Write-Host "  Finished: $ffOut"
}

Write-Host "All audio tracks synthesized successfully!"
