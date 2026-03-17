import { NextResponse } from "next/server";
import OpenAI from "openai";
import { db } from "@/lib/firebaseAdmin";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    const lowerQ = question.toLowerCase();

    const passengersRef = db.collection("promoters");

    // 🔎 1. Buscar por DNI
    const dniMatch = question.match(/\b\d{7,8}\b/);

    if (dniMatch) {
      const dni = dniMatch[0];

      const doc = await passengersRef.doc(dni).get();

      if (!doc.exists) {
        return NextResponse.json({
          answer: `No existe un pasajero con DNI ${dni}.`,
        });
      }

      const data = doc.data();

      // 🔥 traer participantes de ese pasajero
      const participantsSnap = await doc.ref
        .collection("participants")
        .get();

      let participantes = "";

      participantsSnap.forEach((p) => {
        const d = p.data();
        participantes += `- ${d.name}, ${d.edad} años (DNI ${d.dni})\n`;
      });

      return NextResponse.json({
        answer: `El pasajero ${dni} tiene ${
          data?.totalParticipants || 0
        } participantes:\n\n${participantes || "Sin participantes"}`,
      });
    }

    // 🔥 2. Listar participantes por pasajero (SIN IA)
    if (
      lowerQ.includes("cada pasajero") ||
      lowerQ.includes("por pasajero")
    ) {
      const snap = await passengersRef.get();

      let response = "Participantes por pasajero:\n\n";

      for (const doc of snap.docs) {
        const data = doc.data();

        response += `Pasajero ${doc.id} (${
          data.totalParticipants || 0
        } participantes):\n`;

        const participantsSnap = await doc.ref
          .collection("participants")
          .get();

        participantsSnap.forEach((p) => {
          const d = p.data();
          response += `  - ${d.name}, ${d.edad} años (DNI ${d.dni})\n`;
        });

        response += "\n";
      }

      return NextResponse.json({ answer: response });
    }

    // 🔥 3. Traer TODOS los datos (para IA)
    const passengersSnap = await passengersRef.get();

    let totalParticipants = 0;
    let participantsData: any[] = [];

    for (const doc of passengersSnap.docs) {
      const data = doc.data();
      totalParticipants += data.totalParticipants || 0;

      const participantsSnap = await doc.ref
        .collection("participants")
        .get();

      participantsSnap.forEach((p) => {
        const d = p.data();
        participantsData.push({
          pasajero: doc.id,
          nombre: d.name,
          edad: d.edad,
          dni: d.dni,
        });
      });
    }

    // ⚠️ limitar datos para no romper IA
    const limitedParticipants = participantsData.slice(0, 50);

    const context = `
Datos del sistema:

- Total pasajeros: ${passengersSnap.size}
- Total participantes: ${totalParticipants}

Listado de participantes:
${limitedParticipants
  .map(
    (p) =>
      `Pasajero ${p.pasajero}: ${p.nombre}, ${p.edad} años, DNI ${p.dni}`
  )
  .join("\n")}
`;

    // 🤖 4. IA
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
Sos un asistente administrativo.

IMPORTANTE:
- Solo respondé con los datos proporcionados
- No inventes información
- Si no hay datos suficientes, decilo
- "Promotores" significa "pasajeros"

Podés responder sobre:
- nombres
- edades
- participantes
- relaciones entre pasajeros y participantes
          `,
        },
        {
          role: "user",
          content: `${context}\n\nPregunta: ${question}`,
        },
      ],
      temperature: 0.2,
    });

    return NextResponse.json({
      answer: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("ERROR EN /api/chat:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}