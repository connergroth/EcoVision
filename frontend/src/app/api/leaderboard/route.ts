import { NextResponse } from "next/server";

// Replace with your actual implementation
export async function GET() {
    // Example leaderboard data
    const leaderboardData = [
        { username: "EcoWarrior", co2Saved: 2500, uploads: 45, rank: 1 },
        { username: "GreenHero", co2Saved: 2100, uploads: 38, rank: 2 },
        { username: "RecycleMaster", co2Saved: 1800, uploads: 32, rank: 3 },
        { username: "EarthDefender", co2Saved: 1500, uploads: 28, rank: 4 },
        { username: "TrashHunter", co2Saved: 1200, uploads: 25, rank: 5 },
    ];

    return NextResponse.json(leaderboardData);
}