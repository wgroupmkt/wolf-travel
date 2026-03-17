import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const passengersSnapshot = await db.collection("passengers").get();

    const passengers = await Promise.all(
      passengersSnapshot.docs.map(async (doc) => {
        const participantsSnapshot = await db
          .collection("passengers")
          .doc(doc.id)
          .collection("participants")
          .get();

        const participants = participantsSnapshot.docs.map((p) => {
          const data = p.data();

          return {
            name: data.name || "",
            age: data.edad || "",
            numeroSorteo: data.numeroSorteo || "",
          };
        });

        return {
          id: doc.id,
          totalParticipants: participants.length,
          participants,
        };
      })
    );

    return NextResponse.json({ passengers });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al obtener pasajeros" },
      { status: 500 }
    );
  }
}