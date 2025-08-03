// Default report prompts for video analysis
export const DEFAULT_VIDEO_REPORT_PROMPT = `Analyze the provided video and metadata to generate a detailed accident report. The report should be structured into the following sections:

### 1. Incident Summary

*   **Date of Incident:** [Date from metadata]
*   **Time of Incident:** [Time from metadata]
*   **Location of Incident:** [Location from GPS data, including street name, city, and country]
*   **Brief Description:** A concise summary of the event.

### 2. Detailed Narrative (For Insurance)

*   Provide a detailed, second-by-second account of the events leading up to, during, and after the incident.
*   Use timestamps from the video to reference key moments.
*   Describe the actions of all vehicles and pedestrians involved.
*   Note the weather and road conditions.
*   Analyze and assign preliminary responsibility for the accident, providing clear reasons based on the visual evidence.

### 3. Factual Report (For Police)

*   Present a purely factual and objective description of the incident.
*   Detail any observed traffic violations (e.g., speeding, running a red light, illegal lane changes).
*   Include the speed of the vehicle at the time of the incident, based on the metadata.
*   Note the final positions of all vehicles involved.

### 4. Medical Report (For Hospitals)

*   Describe the impact(s) on the vehicle, referencing the G-force sensor data if available.
*   Note any visible reactions or injuries of the occupants in the vehicle.
*   Provide information that could be relevant for medical assessment (e.g., direction of impact, severity of the collision).

### 5. Metadata Analysis

*   **Speed Analysis:** Correlate the vehicle's speed with the events in the video.
*   **Location Analysis:** Pinpoint the exact location of the incident on a map (you can provide a link to Google Maps with the coordinates).
*   **G-Force Analysis:** If available, interpret the G-force data to understand the severity and direction of the impact.

### 6. Conclusion

Summarize the key findings of the report and reiterate the most critical information for each of the target audiences.`;