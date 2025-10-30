import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tabs } = await request.json();
    console.log('Received tabs from extension:', tabs);

    // TODO: Implement logic to save these tabs to the database
    // For example, using Supabase client:
    // const { data, error } = await supabase.from('collected_tabs').insert(tabs);
    // if (error) throw error;

    return NextResponse.json({ message: 'Tabs received successfully', count: tabs.length }, { status: 200 });
  } catch (error) {
    console.error('Error processing tabs:', error);
    return NextResponse.json({ message: 'Failed to process tabs', error: error.message }, { status: 500 });
  }
}