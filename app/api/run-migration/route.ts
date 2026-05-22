import { NextResponse } from 'next/server'
// @ts-expect-error - pg does not have type declarations installed
import { Client } from 'pg'

export async function GET() {
  const connectionString = process.env.POSTGRES_URL_NON_POOLING || 'postgres://postgres.eqllqrppeodrhalpiajx:fcFxfE8Z7BjLbX99@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require'
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    
    // Add column if it doesn't exist
    await client.query(`
      ALTER TABLE interactions
        ADD COLUMN IF NOT EXISTS ai_summary text;
    `)
    
    // Reload PostgREST schema cache
    await client.query(`SELECT pg_notify('pgrst', 'reload schema');`)
    
    await client.end()
    
    return NextResponse.json({
      success: true,
      message: 'Successfully added ai_summary column to interactions and reloaded schema cache!'
    })
  } catch (error: any) {
    try {
      await client.end()
    } catch {}
    
    return NextResponse.json({
      success: false,
      error: error.message || String(error)
    }, { status: 500 })
  }
}
