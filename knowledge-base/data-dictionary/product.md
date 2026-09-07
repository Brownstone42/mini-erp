# Product และ Product Category

## Product Category

| Field | ความหมาย |
| --- | --- |
| categoryCode | รหัสหมวดเดิมจาก Express |
| categoryName | ชื่อหมวดตาม Express |
| isActive | สถานะจาก Full Snapshot ล่าสุด |

## Product

| Field | ความหมาย |
| --- | --- |
| productCode | รหัสสินค้าเดิมจาก Express |
| productName | รายละเอียดสินค้าบรรทัดหลัก |
| largeDescription | รายละเอียดบรรทัดหน่วยใหญ่ |
| categoryCode | หมวดสินค้า |
| smallUnit | หน่วยย่อย |
| largeUnit | หน่วยใหญ่ |
| purchaseUnit / purchaseFactor | หน่วยซื้อและตัวคูณ |
| salesUnit / salesFactor | หน่วยขายและตัวคูณ |
| accountCode | รหัสบัญชี Express |
| standardPrice | ราคามาตรฐาน |
| replacementText | สินค้าทดแทนแบบข้อความ |
| supplierCode | Supplier Master Data; อาจว่างได้ |
| isActive | สถานะจาก Full Snapshot ล่าสุด |

ข้อความตัดหัวและท้ายก่อนบันทึก ตัวเลขเก็บเป็น numeric และค่าว่างจากไฟล์เขียนทับค่าเดิม
