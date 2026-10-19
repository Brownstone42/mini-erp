# Export Master Data จาก Express

สถานะ: ขั้นตอน Supplier, Customer และ Product บันทึกครบแล้ว

## เป้าหมาย

Export ข้อมูล Supplier, Customer และ Product จาก Express เพื่อนำมาเป็นข้อมูลต้นทางของ ERP ใหม่ Product Category มาจากไฟล์ Product เดียวกัน

ไฟล์จริงเก็บใน `private-data/express-export/raw/` ซึ่งไม่อยู่ใน Git วันที่ในชื่อไฟล์เป็นวันที่ Export

## ข้อมูลที่ต้องบันทึกระหว่างทดลอง Export

- ชื่อเมนูและลำดับขั้นตอนใน Express
- ตัวกรองหรือช่วงข้อมูลที่ใช้
- ประเภทไฟล์ที่ได้ เช่น Excel, CSV หรือ DBF
- encoding และรูปแบบวันที่/ตัวเลข
- จำนวนรายการทั้งหมด
- ชื่อ column ที่ได้
- field ที่ว่างหรือข้อมูลผิดรูปแบบที่พบ
- วิธีตรวจว่าข้อมูล Export มาครบ

## Supplier

1. ใน Express เข้า `รายงาน` > `พิมพ์รายงาน` > `รายงานเจ้าหนี้` > `รายละเอียดผู้จำหน่าย/เจ้าหนี้`
2. ปล่อยตัวกรองทุกช่องว่างไว้ เพื่อ Export Supplier **ครบทั้งหมด**
3. ติ๊ก `Export to Excel` แล้วกดพิมพ์รายงาน
4. ในหน้าต่าง `แสดงผลทาง` เลือก `แฟ้มข้อมูล`
5. ในหน้าต่าง `เลือกชนิดของแฟ้มข้อมูล` เลือก `แฟ้มข้อมูลพิเศษ (CSV เพื่อ Excel)`
6. บันทึกลง `private-data/express-export/raw/` ชื่อ `express_suppliers_YYYY-MM-DD.csv` โดยใช้วันที่ Export
7. ใน Mini ERP เข้า `Master Data` > `Supplier` > `Import` แล้ว Preview จำนวนรายการและรายการที่จะปิดใช้งานก่อนยืนยัน

ไฟล์นี้ต้องเป็น Full Snapshot; รหัส Supplier ที่หายไปจากไฟล์จะถูกเปลี่ยนเป็นไม่ใช้งาน

## Customer

1. ใน Express เข้า `รายงาน` > `พิมพ์รายงาน` > `รายงานลูกหนี้` > `รายละเอียดลูกค้า` > `แยกตามประเภทลูกค้า`
2. ปล่อยตัวกรองทุกช่องว่างไว้ เพื่อ Export Customer **ครบทุกประเภท**
3. ติ๊ก `Export to Excel` แล้วกดพิมพ์รายงาน
4. ในหน้าต่าง `แสดงผลทาง` เลือก `แฟ้มข้อมูล`
5. ในหน้าต่าง `เลือกชนิดของแฟ้มข้อมูล` เลือก `แฟ้มข้อมูลพิเศษ (CSV เพื่อ Excel)`
6. บันทึกลง `private-data/express-export/raw/` ชื่อ `express_customers_YYYY-MM-DD.csv` โดยใช้วันที่ Export
7. ใน Mini ERP เข้า `Master Data` > `Customer` > `Import` แล้ว Preview จำนวนรายการและรายการที่จะปิดใช้งานก่อนยืนยัน

ไฟล์นี้ต้องเป็น Full Snapshot; รหัส Customer ที่หายไปจากไฟล์จะถูกเปลี่ยนเป็นไม่ใช้งาน

## Product และ Product Category

1. ใน Express เข้า `รายงาน` > `พิมพ์รายงาน` > `รายงานสินค้าคงคลัง` > `รายละเอียดสินค้า`
2. ปล่อยตัวกรองทุกช่องว่างไว้ เพื่อ Export Product **ครบทั้งหมด**
3. ติ๊ก `Export to Excel` แล้วกดพิมพ์รายงาน
4. ในหน้าต่าง `แสดงผลทาง` เลือก `แฟ้มข้อมูล`
5. ในหน้าต่าง `เลือกชนิดของแฟ้มข้อมูล` เลือก `แฟ้มข้อมูลพิเศษ (CSV เพื่อ Excel)`
6. บันทึกลง `private-data/express-export/raw/` ชื่อ `express_products_YYYY-MM-DD.csv` โดยใช้วันที่ Export
7. ใน Mini ERP เข้า `Master Data` > `Product` > `Import` แล้ว Preview จำนวน Product, Product Category และรายการที่จะปิดใช้งานก่อนยืนยัน

ระบบอ่าน Product Category จากไฟล์ Product เดียวกัน ไฟล์นี้ต้องเป็น Full Snapshot; รหัสสินค้าที่หายไปจากไฟล์จะถูกเปลี่ยนเป็นไม่ใช้งาน

## ปัญหาที่พบ

- ห้าม Import ไฟล์ที่กรองเหลือเพียงบางรหัส/บางหมวด เพราะรายการที่ไม่อยู่ใน Full Snapshot อาจถูกปิดใช้งาน
