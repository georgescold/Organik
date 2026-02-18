/**
 * Script pour récupérer tous les carrousels d'un compte
 * Usage: node get-all-carousels.js <API_URL> <API_KEY>
 * Example: node get-all-carousels.js http://localhost:3000 sk_live_ahzk...
 */

const API_URL = process.env.API_URL || process.argv[2] || "http://localhost:3000";
const API_KEY = process.env.API_KEY || process.argv[3] || "sk_live_ahzk";

async function getAllCarousels() {
  try {
    console.log("🔍 Récupération des carrousels...\n");

    // Première requête pour obtenir le total
    const firstResponse = await fetch(`${API_URL}/api/v1/carousels?limit=1&offset=0`, {
      method: "GET",
      headers: {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!firstResponse.ok) {
      const error = await firstResponse.json();
      throw new Error(`Erreur API (${firstResponse.status}): ${JSON.stringify(error)}`);
    }

    const firstData = await firstResponse.json();
    const total = firstData.pagination.total;

    console.log(`📊 Total de carrousels trouvés: ${total}\n`);

    if (total === 0) {
      console.log("Aucun carrousel trouvé.");
      return [];
    }

    // Récupérer tous les carrousels en une seule requête
    const response = await fetch(`${API_URL}/api/v1/carousels?limit=${total}&offset=0`, {
      method: "GET",
      headers: {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erreur API (${response.status}): ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const carousels = data.data;

    console.log("✅ Carrousels récupérés avec succès!\n");
    console.log("=" .repeat(80));

    // Afficher chaque carrousel
    carousels.forEach((carousel, index) => {
      console.log(`\n🎡 Carrousel #${index + 1}`);
      console.log("-".repeat(80));
      console.log(`ID: ${carousel.id}`);
      console.log(`Topic: ${carousel.topic || "N/A"}`);
      console.log(`Description: ${carousel.description || "N/A"}`);
      console.log(`Status: ${carousel.status}`);
      console.log(`Nombre de slides: ${carousel.slideCount}`);
      console.log(`Créé le: ${new Date(carousel.createdAt).toLocaleString("fr-FR")}`);
      console.log(`Mis à jour le: ${new Date(carousel.updatedAt).toLocaleString("fr-FR")}`);

      if (carousel.slides && carousel.slides.length > 0) {
        console.log(`\n📄 Slides:`);
        carousel.slides.forEach((slide) => {
          console.log(`  - Slide ${slide.index}: ${slide.content?.substring(0, 50)}...`);
          if (slide.imageUrl) {
            console.log(`    Image: ${slide.imageUrl}`);
          }
        });
      }
    });

    console.log("\n" + "=".repeat(80));
    console.log(`\n📈 Résumé:`);
    console.log(`   Total: ${carousels.length} carrousels`);
    console.log(`   Status: ${carousels.filter(c => c.status === "draft").length} brouillons, ${carousels.filter(c => c.status === "published").length} publiés`);

    // Sauvegarder dans un fichier JSON
    const fs = require("fs");
    const filename = `carousels-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(carousels, null, 2));
    console.log(`\n💾 Données sauvegardées dans: ${filename}`);

    return carousels;
  } catch (error) {
    console.error("❌ Erreur:", error.message);
    process.exit(1);
  }
}

// Exécuter
getAllCarousels();
