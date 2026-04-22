
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import type { UserData } from '@/types/user';

export async function GET() {
  // In a real production app, you would use Firebase Admin SDK to verify the token
  // and ensure the user has admin privileges. For this demo, we assume the call
  // is made by an authorized admin.
  
  if (!db) {
    return new NextResponse('Firestore not initialized', { status: 500 });
  }

  try {
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(query(usersCollection));

    let totalUsers = 0;
    let proUsers = 0;
    let mrr = 0;
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data() as UserData;
      totalUsers++;
      if (userData.plan === 'pro_month' && userData.subscriptionStatus === 'active') {
        proUsers++;
        mrr += userData.price || 0;
      }
    });
    
    const stats = {
      totalUsers,
      proUsers,
      freeUsers: totalUsers - proUsers,
      mrr: mrr,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
