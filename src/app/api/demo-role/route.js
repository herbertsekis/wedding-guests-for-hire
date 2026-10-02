import { NextResponse } from 'next/server';
import { db } from '../../../lib/supabase';
import { demoCookie, makeDemoSession } from '../../../lib/session';
export async function POST(request) { try { const { employeeId }=await request.json(); const {data,error}=await db().from('employees').select('id').eq('id',employeeId).single(); if(error||!data) return NextResponse.json({error:'Unknown employee.'},{status:404}); const response=NextResponse.json({ok:true}); response.cookies.set(demoCookie,makeDemoSession(data.id),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'}); return response; } catch(e) { return NextResponse.json({error:e.message},{status:500}); } }
