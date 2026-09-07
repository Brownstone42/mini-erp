# Sales History

| Field | ความหมาย |
| --- | --- |
| sourceKey | รหัสรายการภายในที่สร้างซ้ำได้จากข้อมูล Express |
| transactionDate | วันที่เอกสาร แปลงจากปี พ.ศ. เป็น ค.ศ. |
| documentNumber | เลขที่ Invoice หรือ Sales Return |
| productCode | อ้างอิง Product Master |
| customerCode | อ้างอิง Customer Master |
| sourceQuantity | จำนวนค่าบวกตามรายงาน |
| sourceUnitText | หน่วยที่แสดงในรายงาน เก็บตามต้นฉบับ |
| isReturn | ช่องคืนเป็น Y |
| unitPrice | ราคาต่อหน่วยตามรายงาน |
| sourceVatCode | คอลัมน์ถัดจากราคาต่อหน่วยตามรายงาน |
| lineDiscountText | ส่วนลดรายการตามต้นฉบับ |
| grossAmount | รวมเงินตามรายงาน |
| overallDiscountText | ส่วนลดรวมตามต้นฉบับ |
| netAmount | ยอดขายสุทธิค่าบวกตามรายงาน |
| referenceText | เลขที่เอกสารอ้างอิง |
| noteText | หมายเหตุ |
| salesFactor | ตัวคูณหน่วยขายจาก Product Master ณ เวลา Import |
| analysisQuantity | จำนวนฐานสำหรับวิเคราะห์; รายการคืนเป็นค่าลบ |
| analysisNetAmount | ยอดสุทธิสำหรับวิเคราะห์; รายการคืนเป็นค่าลบ |
| isActive | สถานะจาก Snapshot ล่าสุดของช่วงวันที่ |
