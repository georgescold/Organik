
const { Prisma } = require('@prisma/client');

async function main() {
    try {
        const dmmf = Prisma.dmmf;
        const competitorPost = dmmf.datamodel.models.find(m => m.name === 'CompetitorPost');

        if (competitorPost) {
            console.log('CompetitorPost Fields:', competitorPost.fields.map(f => f.name));
            console.log('Has carouselImages:', competitorPost.fields.some(f => f.name === 'carouselImages'));
            console.log('Has slideCount:', competitorPost.fields.some(f => f.name === 'slideCount'));
        } else {
            console.log('CompetitorPost model NOT found in DMMF');
        }
    } catch (e) {
        console.error('Error accessing DMMF:', e);
    }
}

main();
