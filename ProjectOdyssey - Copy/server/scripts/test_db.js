const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SB_PROJECT_URL, process.env.SB_SERVICE_ROLE_KEY || process.env.SB_API_KEY);

async function testQuery() {
    const { data: pois, error: err1 } = await supabase.from('pois').select('id, name, google_place_id').limit(5);
    console.log("POIs:", pois);

    const { data: places, error: err2 } = await supabase.from('places').select('id, name, google_place_id').limit(5);
    console.log("Places:", places);

    const { data: cities, error: err3 } = await supabase.from('cities').select('id, name, google_place_id').limit(5);
    console.log("Cities:", cities);
}

testQuery();
