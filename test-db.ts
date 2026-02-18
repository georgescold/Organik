
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Attempting to connect...')
    try {
        await prisma.$connect()
        console.log('Successfully connected!')

        // Test simple query
        const userCount = await prisma.user.count()
        console.log(`User count: ${userCount}`)

    } catch (e: any) {
        console.error('Connection failed:', e.message)
        console.error('Error code:', e.code)
    } finally {
        await prisma.$disconnect()
    }
}

main()
