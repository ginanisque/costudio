<?php
ini_set('session.use_strict_mode', '1');
session_set_cookie_params(['lifetime'=>0,'path'=>'/','httponly'=>true,'secure'=>(!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off'),'samesite'=>'Strict']);
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/csrf.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}
csrf_verify();
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$userId = (int) $_SESSION['user_id'];
$fields = [
    ['key'=>'bust','label'=>'Bust','code'=>'w-bust-circ'],
    ['key'=>'bust_span','label'=>'Bust Span','code'=>'w-bust-span'],
    ['key'=>'bust_radius','label'=>'Bust Radius','code'=>'w-bust-radius'],
    ['key'=>'bust_point','label'=>'Bust Point','code'=>'w-bust-point'],
    ['key'=>'full_front_length','label'=>'Full Front Length','code'=>'w-full-front-length'],
    ['key'=>'across_chest','label'=>'Across Chest','code'=>'w-across-chest (2)'],
    ['key'=>'across_back','label'=>'Across Back','code'=>'w-acrossback-meas2'],
    ['key'=>'nape_to_waist','label'=>'Nape to Waist','code'=>'w-nape-waist'],
    ['key'=>'front_shoulder','label'=>'Front Shoulder','code'=>'w-front-shoulder-measure'],
    ['key'=>'back_shoulder','label'=>'Back Shoulder','code'=>'w-back-shoulder-measure'],
    ['key'=>'bicep','label'=>'Bicep','code'=>'w-m-bicep-circ'],
    ['key'=>'knee_circ','label'=>'Knee Circ','code'=>'w-knee-circ'],
    ['key'=>'full_sleeve_length','label'=>'Full Sleeve length','code'=>'w-Sleeve'],
    ['key'=>'side_waist_to_knee','label'=>'Side waist to knee','code'=>'w-side-waist-to-knee'],
    ['key'=>'side_waist_to_floor','label'=>'Side waist to floor','code'=>'w-sidewaist-floor-measure'],
    ['key'=>'center_front_waist_to_floor','label'=>'Center front waist to floor','code'=>'w-cf-floor-meas-gp'],
    ['key'=>'center_back_to_floor','label'=>'Center Back to floor','code'=>'w-center-back-floor'],
    ['key'=>'bodyrise','label'=>'Bodyrise','code'=>'w-bodyrise'],
    ['key'=>'waist','label'=>'Waist','code'=>'w-waistline'],
    ['key'=>'hip','label'=>'Hip','code'=>'w-hipline'],
    ['key'=>'lower_abdomen','label'=>'Lower abdomen','code'=>'w-lower-abdomen'],
    ['key'=>'under_bust','label'=>'Under Bust','code'=>'w-under-bust'],
];

function demo_measurements(array $fields, array $values, string $takenAt, string $takenBy, string $analysis): array
{
    return ['record' => [
        'templateId'=>'ginani-female', 'templateName'=>'GINANI FEMALE',
        'templateCategory'=>'Size 12', 'fields'=>$fields, 'values'=>$values,
        'unit'=>'in', 'source'=>'taken_in_person', 'takenAt'=>$takenAt,
        'takenBy'=>$takenBy, 'fitAnalysis'=>$analysis,
        'notes'=>'Competition demo record. Garments worn while measuring: fitted base layer.',
    ], 'history'=>[]];
}

$clients = [
    [
        'key'=>'amina', 'name'=>'Amina Bello', 'email'=>'demo.amina@costudio.test', 'phone'=>'+234 803 555 0101',
        'preferences'=>'Editorial occasionwear, jewel tones, natural silk and a defined waist.',
        'notes'=>'Competition demo client. Prefers WhatsApp and afternoon fittings.',
        'measurements'=>demo_measurements($fields, [
            'bust'=>36,'bust_span'=>7.5,'bust_radius'=>3.125,'bust_point'=>10.625,'full_front_length'=>17,
            'across_chest'=>14,'across_back'=>14.5,'nape_to_waist'=>15.5,'front_shoulder'=>14.875,
            'back_shoulder'=>15.875,'bicep'=>12,'knee_circ'=>15,'full_sleeve_length'=>23.5,
            'side_waist_to_knee'=>24,'side_waist_to_floor'=>43,'center_front_waist_to_floor'=>42.5,
            'center_back_to_floor'=>43.5,'bodyrise'=>11,'waist'=>28,'hip'=>40,'lower_abdomen'=>36,'under_bust'=>29,
        ], date('Y-m-d', strtotime('-8 days')), 'Ginani Apparel', 'Balanced posture; allow gentle ease through the lower abdomen.'),
    ],
    [
        'key'=>'tola', 'name'=>'Tola Mensah', 'email'=>'demo.tola@costudio.test', 'phone'=>'+233 24 555 0188',
        'preferences'=>'Minimal tailoring, neutral palette, clean architectural lines.',
        'notes'=>'Competition demo client. Referred by Amina.',
        'measurements'=>demo_measurements($fields, [
            'bust'=>38,'bust_span'=>8,'bust_radius'=>3.25,'bust_point'=>11,'full_front_length'=>17.5,
            'across_chest'=>14.75,'across_back'=>15,'nape_to_waist'=>16,'front_shoulder'=>15.25,
            'back_shoulder'=>16,'bicep'=>12.5,'knee_circ'=>15.5,'full_sleeve_length'=>24,
            'side_waist_to_knee'=>24.5,'side_waist_to_floor'=>44,'center_front_waist_to_floor'=>43,
            'center_back_to_floor'=>44,'bodyrise'=>11.5,'waist'=>30,'hip'=>41,'lower_abdomen'=>37,'under_bust'=>31,
        ], date('Y-m-d', strtotime('-15 days')), 'Ginani Apparel', 'Right shoulder is slightly lower; balance at the first fitting.'),
    ],
    [
        'key'=>'zuri', 'name'=>'Zuri Okafor', 'email'=>'demo.zuri@costudio.test', 'phone'=>'+27 82 555 0142',
        'preferences'=>'Bright print separates and comfortable event dressing.',
        'notes'=>'Competition demo client. Measurement table sent and awaiting return.',
        'measurements'=>[],
    ],
];

$pdo = db();
$pdo->beginTransaction();
try {
    $clientIds = [];
    foreach ($clients as $client) {
        $find = $pdo->prepare('SELECT id FROM customers WHERE user_id=? AND email=? LIMIT 1');
        $find->execute([$userId, $client['email']]);
        $id = (int) ($find->fetchColumn() ?: 0);
        if (!$id) {
            $pdo->prepare('INSERT INTO customers (user_id,name,email,phone,measurements,preferences,notes) VALUES (?,?,?,?,?,?,?)')
                ->execute([$userId,$client['name'],$client['email'],$client['phone'],json_encode($client['measurements']),$client['preferences'],$client['notes']]);
            $id = (int) $pdo->lastInsertId();
        }
        $clientIds[$client['key']] = $id;
    }

    $orders = [
        ['demo-evening-gown',$clientIds['amina'],'Silk Evening Gown','bespoke',1,185000,'₦','in_production','deposit',90000,'-6 days'],
        ['demo-tailored-set',$clientIds['tola'],'Architectural Tailored Set','bespoke',1,145000,'₦','ready','paid',145000,'-13 days'],
        ['demo-print-capsule',null,'Print Capsule Separates','stock',6,65000,'₦','in_stock','unpaid',0,'-20 days'],
    ];
    foreach ($orders as $order) {
        $marker = '[COSTUDIO_DEMO:' . $order[0] . ']';
        $find = $pdo->prepare('SELECT id FROM orders WHERE user_id=? AND notes LIKE ? LIMIT 1');
        $find->execute([$userId, '%' . $marker . '%']);
        if (!$find->fetchColumn()) {
            $pdo->prepare('INSERT INTO orders (user_id,customer_id,product_name,product_id,order_type,quantity,price_agreed,currency,status,payment_status,deposit_amount,notes,materials_json,ordered_at) VALUES (?,?,?,NULL,?,?,?,?,?,?,?,?,?,?)')
                ->execute([$userId,$order[1],$order[2],$order[3],$order[4],$order[5],$order[6],$order[7],$order[8],$order[9],$marker . ' Seeded competition demo order.','[]',date('Y-m-d H:i:s', strtotime($order[10]))]);
        }
    }
    $pdo->commit();
    echo json_encode(['ok'=>true,'clients'=>count($clients),'orders'=>count($orders)]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error'=>'Could not load demo CRM data. Confirm the latest MySQL setup has been applied.']);
}
