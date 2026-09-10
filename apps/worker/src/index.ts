// Background worker for MtandaoLabs EDU.
//
// Jobs are not wired up yet: email, M-Pesa, and PDF work currently runs inline
// in the web app. This process is reserved for moving heavy and scheduled work
// (report generation, bulk messaging) off the request path.
console.log("MtandaoLabs EDU worker started (no jobs registered yet).");
