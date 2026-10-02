"use server";

// A no-operation server action
// The browser can call this and if there is a version mismatch, it will 
// trigger a full page reload. (I think)
export async function noop() {}