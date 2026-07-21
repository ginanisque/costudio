(function () {
  'use strict';
  const client = window.costudioAuth;
  let contextPromise = null;
  const ok = data => ({ ok: true, status: 200, data });
  const fail = (message, status = 400) => ({ ok: false, status, data: { error: message } });
  const number = value => Number(value) || 0;
  const idFrom = url => Number(new URL(url, location.href).searchParams.get('id')) || 0;
  const dateLabel = value => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  async function context(force = false) {
    if (force) contextPromise = null;
    if (contextPromise) return contextPromise;
    contextPromise = (async () => {
      const { data: auth } = await client.auth.getUser();
      if (!auth.user?.id) return null;
      const { data: memberships, error } = await client.from('business_members').select('business_id,created_at').eq('user_id', auth.user.id).order('created_at');
      if (error || !memberships?.length) return null;
      const preferredId = localStorage.getItem('costudio.activeBusinessId');
      const membership = memberships.find(item => item.business_id === preferredId) || memberships[0];
      const { data: business } = await client.from('businesses').select('*').eq('id', membership.business_id).single();
      if (!business) return null;
      return { auth: auth.user, business };
    })();
    return contextPromise;
  }

  function userShape(ctx) {
    return { id: ctx.auth.id, name: ctx.business.name, email: ctx.auth.email || 'demo@costudio.local', cur: ctx.business.currency_symbol, curCode: ctx.business.currency_code, unit: ctx.business.measurement_unit, measurementUnit: ctx.business.measurement_record_unit || 'cm', businessEmail: ctx.business.business_email || '', phone: ctx.business.phone_primary || '', logo: ctx.business.logo_data_url || '', lastLogin: ctx.auth.last_sign_in_at };
  }
  function productRow(r) { return { id:Number(r.id),name:r.name,cat:r.category,date:dateLabel(r.created_at),cogs:number(r.cogs),pricing:r.pricing,fabrics:r.fabrics||[],trims:r.trims||[],time:r.production_time,rate:number(r.hourly_rate) }; }
  function clientRow(r) { return { id:Number(r.id),name:r.name,email:r.email||'',phone:r.phone||'',measurements:r.measurements||{},preferences:r.preferences||'',notes:r.notes||'',createdAt:r.created_at }; }
  function templateRow(r) { return { id:Number(r.id),name:r.name,category:r.category||'',unit:r.unit||'in',fields:r.fields||[],createdAt:r.created_at,updatedAt:r.updated_at }; }
  function materialRow(r) { return { id:Number(r.id),name:r.name,type:r.type,unit:r.unit,pricePerUnit:number(r.price_per_unit),qtyInStock:number(r.qty_in_stock),source:r.source,customerName:r.customer_name||'',notes:r.notes||'',createdAt:r.created_at }; }
  function orderRow(r) { return { id:Number(r.id),orderType:r.order_type,customerId:r.customer_id===null?null:Number(r.customer_id),customerName:r.crm_clients?.name||'',productName:r.product_name,productId:r.product_id===null?null:Number(r.product_id),quantity:Number(r.quantity)||1,priceAgreed:number(r.price_agreed),currency:r.currency,status:r.status,paymentStatus:r.payment_status,depositAmount:number(r.deposit_amount),notes:r.notes||'',materials:r.materials||[],orderedAt:r.ordered_at,updatedAt:r.updated_at }; }

  async function save(table, businessId, body, values) {
    const payload = { business_id: businessId, ...values };
    const query = body.id ? client.from(table).update(payload).eq('id', Number(body.id)).eq('business_id', businessId) : client.from(table).insert(payload);
    const { data, error } = await query.select('id').single();
    return error ? fail(error.message) : ok({ ok:true, id:Number(data.id) });
  }

  async function demo(ctx) {
    const businessId = ctx.business.id;
    const fields = [
      ['bust','Bust','w-bust-circ'],['bust_span','Bust Span','w-bust-span'],['bust_radius','Bust Radius','w-bust-radius'],['bust_point','Bust Point','w-bust-point'],['full_front_length','Full Front Length','w-full-front-length'],['across_chest','Across Chest','w-across-chest (2)'],['across_back','Across Back','w-acrossback-meas2'],['nape_to_waist','Nape to Waist','w-nape-waist'],['front_shoulder','Front Shoulder','w-front-shoulder-measure'],['back_shoulder','Back Shoulder','w-back-shoulder-measure'],['bicep','Bicep','w-m-bicep-circ'],['knee_circ','Knee Circ','w-knee-circ'],['full_sleeve_length','Full Sleeve length','w-Sleeve'],['side_waist_to_knee','Side waist to knee','w-side-waist-to-knee'],['side_waist_to_floor','Side waist to floor','w-sidewaist-floor-measure'],['center_front_waist_to_floor','Center front waist to floor','w-cf-floor-meas-gp'],['center_back_to_floor','Center Back to floor','w-center-back-floor'],['bodyrise','Bodyrise','w-bodyrise'],['waist','Waist','w-waistline'],['hip','Hip','w-hipline'],['lower_abdomen','Lower abdomen','w-lower-abdomen'],['under_bust','Under Bust','w-under-bust']
    ].map(([key,label,code])=>({key,label,code}));
    const values = {bust:36,bust_span:7.5,bust_radius:3.125,bust_point:10.625,full_front_length:17,across_chest:14,across_back:14.5,nape_to_waist:15.5,front_shoulder:14.875,back_shoulder:15.875,bicep:12,knee_circ:15,full_sleeve_length:23.5,side_waist_to_knee:24,side_waist_to_floor:43,center_front_waist_to_floor:42.5,center_back_to_floor:43.5,bodyrise:11,waist:28,hip:40,lower_abdomen:36,under_bust:29};
    const clients = [
      {name:'Amina Bello',email:'demo.amina@costudio.test',phone:'+234 803 555 0101',preferences:'Editorial occasionwear, jewel tones, natural silk and a defined waist.',notes:'Competition demo client. Prefers WhatsApp and afternoon fittings.',measurements:{record:{templateId:'ginani-female',templateName:'GINANI FEMALE',templateCategory:'Size 12',fields,values,unit:'in',source:'taken_in_person',takenAt:new Date(Date.now()-8*864e5).toISOString().slice(0,10),takenBy:ctx.business.name,fitAnalysis:'Balanced posture; allow gentle ease through the lower abdomen.',notes:'Competition demo record.'},history:[]}},
      {name:'Tola Mensah',email:'demo.tola@costudio.test',phone:'+233 24 555 0188',preferences:'Minimal tailoring, neutral palette, clean architectural lines.',notes:'Competition demo client.',measurements:{}},
      {name:'Zuri Okafor',email:'demo.zuri@costudio.test',phone:'+27 82 555 0142',preferences:'Bright print separates and comfortable event dressing.',notes:'Measurement table sent and awaiting return.',measurements:{}}
    ];
    const ids = {};
    for (const row of clients) {
      let { data } = await client.from('crm_clients').select('id').eq('business_id',businessId).eq('email',row.email).maybeSingle();
      if (!data) ({ data } = await client.from('crm_clients').insert({business_id:businessId,...row}).select('id').single());
      if (!data) return fail('Could not seed demo clients. Run the latest Supabase migration.');
      ids[row.email] = Number(data.id);
    }
    const orders = [
      {customer_id:ids['demo.amina@costudio.test'],product_name:'Silk Evening Gown',order_type:'bespoke',quantity:1,price_agreed:185000,currency:'₦',status:'in_production',payment_status:'deposit',deposit_amount:90000,notes:'[COSTUDIO_DEMO:evening-gown]'},
      {customer_id:ids['demo.tola@costudio.test'],product_name:'Architectural Tailored Set',order_type:'bespoke',quantity:1,price_agreed:145000,currency:'₦',status:'ready',payment_status:'paid',deposit_amount:145000,notes:'[COSTUDIO_DEMO:tailored-set]'},
      {customer_id:null,product_name:'Print Capsule Separates',order_type:'stock',quantity:6,price_agreed:65000,currency:'₦',status:'in_stock',payment_status:'unpaid',deposit_amount:0,notes:'[COSTUDIO_DEMO:print-capsule]'}
    ];
    for (const row of orders) {
      const { data } = await client.from('crm_orders').select('id').eq('business_id',businessId).eq('notes',row.notes).maybeSingle();
      if (!data) await client.from('crm_orders').insert({business_id:businessId,materials:[],...row});
    }
    return ok({ok:true,clients:3,orders:3});
  }

  async function request(rawUrl, method = 'GET', body = null) {
    const url = new URL(rawUrl, location.href);
    const file = url.pathname.split('/').pop();
    const action = body?.action || url.searchParams.get('action') || '';
    try {
      if (file === 'auth.php') {
        if (action === 'logout') return ok({ok:true});
        const ctx = await context(action === 'supabase_session');
        if (action === 'me') return ok(ctx ? {loggedIn:true,csrfToken:'supabase',user:userShape(ctx)} : {loggedIn:false});
        if (!ctx) return fail('Not authenticated',401);
        if (action === 'supabase_session') return ok({ok:true,csrfToken:'supabase',user:userShape(ctx)});
        if (action === 'update_profile') {
          return fail('Business defaults are managed in Workspace Settings.', 409);
        }
        if (action === 'change_password') { const signed=await client.auth.signInWithPassword({email:ctx.auth.email,password:body.current});if(signed.error)return fail('Current password is incorrect.',401);const changed=await client.auth.updateUser({password:body.new});return changed.error?fail(changed.error.message):ok({ok:true}); }
      }

      const ctx = await context();
      if (!ctx) return fail('Not authenticated',401);
      const bid = ctx.business.id;

      if (file === 'state.php') {
        if (method === 'GET') { const {data,error}=await client.from('costing_state').select('*').eq('business_id',bid).maybeSingle();return error?fail(error.message):ok(data?{setup:data.setup,computed:data.computed,fabrics:data.fabrics,trims:data.trims,time:data.production_time}:null); }
        const {error}=await client.from('costing_state').upsert({business_id:bid,setup:body.setup||{},computed:body.computed||{},fabrics:body.fabrics||[],trims:body.trims||[],production_time:body.time||{}});return error?fail(error.message):ok({ok:true});
      }
      if (file === 'products.php') {
        if (method === 'GET') {const {data,error}=await client.from('costing_products').select('*').eq('business_id',bid).order('created_at',{ascending:false});return error?fail(error.message):ok((data||[]).map(productRow));}
        if (method === 'DELETE') {const {error}=await client.from('costing_products').delete().eq('id',idFrom(rawUrl)).eq('business_id',bid);return error?fail(error.message):ok({ok:true});}
        return save('costing_products',bid,body,{name:body.name,category:body.cat||'other',cogs:number(body.cogs),pricing:body.pricing||{},fabrics:body.fabrics||[],trims:body.trims||[],production_time:body.time||{},hourly_rate:number(body.rate)});
      }
      if (file === 'customers.php') {
        if (method === 'GET') {const {data,error}=await client.from('crm_clients').select('*').eq('business_id',bid).order('name');return error?fail(error.message):ok((data||[]).map(clientRow));}
        if (method === 'DELETE') {const {error}=await client.from('crm_clients').delete().eq('id',idFrom(rawUrl)).eq('business_id',bid);return error?fail(error.message):ok({ok:true});}
        return save('crm_clients',bid,body,{name:body.name,email:body.email||'',phone:body.phone||'',measurements:body.measurements||{},preferences:body.preferences||'',notes:body.notes||''});
      }
      if (file === 'measurement-templates.php') {
        if (method === 'GET') {const {data,error}=await client.from('crm_measurement_templates').select('*').eq('business_id',bid).order('name');return error?fail(error.message):ok((data||[]).map(templateRow));}
        if (method === 'DELETE') {const {error}=await client.from('crm_measurement_templates').delete().eq('id',idFrom(rawUrl)).eq('business_id',bid);return error?fail(error.message):ok({ok:true});}
        return save('crm_measurement_templates',bid,body,{name:body.name,category:body.category||'',unit:body.unit==='cm'?'cm':'in',fields:body.fields||[]});
      }
      if (file === 'materials.php') {
        if (method === 'GET') {const {data,error}=await client.from('costing_materials').select('*').eq('business_id',bid).order('type').order('name');return error?fail(error.message):ok((data||[]).map(materialRow));}
        if (method === 'DELETE') {const {error}=await client.from('costing_materials').delete().eq('id',idFrom(rawUrl)).eq('business_id',bid);return error?fail(error.message):ok({ok:true});}
        return save('costing_materials',bid,body,{name:body.name,type:body.type||'fabric',unit:body.unit||'m',price_per_unit:body.source==='customer'?0:number(body.pricePerUnit),qty_in_stock:number(body.qtyInStock),source:body.source||'business',customer_name:body.customerName||'',notes:body.notes||''});
      }
      if (file === 'orders.php') {
        if (method === 'GET') {let q=client.from('crm_orders').select('*,crm_clients(name)').eq('business_id',bid).order('ordered_at',{ascending:false});const cid=Number(url.searchParams.get('customer_id'))||0;if(cid)q=q.eq('customer_id',cid);const {data,error}=await q;return error?fail(error.message):ok((data||[]).map(orderRow));}
        if (method === 'DELETE') {const {error}=await client.from('crm_orders').delete().eq('id',idFrom(rawUrl)).eq('business_id',bid);return error?fail(error.message):ok({ok:true});}
        if (method === 'PATCH') {const values={};if(body.status!==undefined)values.status=body.status;if(body.paymentStatus!==undefined)values.payment_status=body.paymentStatus;if(body.depositAmount!==undefined)values.deposit_amount=number(body.depositAmount);if(body.priceAgreed!==undefined)values.price_agreed=number(body.priceAgreed);const {error}=await client.from('crm_orders').update(values).eq('id',Number(body.id)).eq('business_id',bid);return error?fail(error.message):ok({ok:true});}
        return save('crm_orders',bid,body,{customer_id:body.customerId||null,product_name:body.productName,product_id:body.productId||null,order_type:body.orderType||'bespoke',quantity:Number(body.quantity)||1,price_agreed:number(body.priceAgreed),currency:body.currency||ctx.business.currency_symbol,status:body.status||'quote',payment_status:body.paymentStatus||'unpaid',deposit_amount:number(body.depositAmount),notes:body.notes||'',materials:body.materials||[],ordered_at:body.orderedAt?new Date(body.orderedAt).toISOString():new Date().toISOString()});
      }
      if (file === 'feedback.php') {
        if (method === 'GET') {const {data,error}=await client.from('costudio_feedback').select('*').eq('business_id',bid).maybeSingle();return error?fail(error.message):ok(data?{exists:true,businessType:data.business_type,country:data.country,raisedPrices:data.raised_prices,priceIncrease:data.price_increase,impactText:data.impact_text,consent:data.consent}:{exists:false});}
        const {error}=await client.from('costudio_feedback').upsert({business_id:bid,business_type:body.businessType||'',country:body.country||'',raised_prices:body.raisedPrices,price_increase:body.priceIncrease===''?null:number(body.priceIncrease),impact_text:body.impactText||'',consent:!!body.consent});return error?fail(error.message):ok({ok:true});
      }
      if (file === 'demo.php') return demo(ctx);
      return null;
    } catch (error) { return fail(error?.message || 'Supabase request failed.',500); }
  }

  window.costudioDataApi = { request };
})();
