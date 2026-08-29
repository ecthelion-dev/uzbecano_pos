//! Chek printeriga to'g'ridan-to'g'ri chop etish.
//!
//! Webview'dagi `window.print()` har doim tizimning chop etish panelini ochadi
//! va uni jimgina o'tkazib yuborishning iloji yo'q — kassir har bir yopilgan
//! stoldan keyin dialog yopishga majbur bo'lardi. Brauzerdagi PWA uchun bu
//! to'g'ri xatti-harakat (foydalanuvchi printerni tanlaydi), desktop kassa
//! uchun esa nuqson.
//!
//! Bu modul ESC/POS baytlarini tizim navbatiga xom holda uzatadi: hech qanday
//! dialog yo'q, hech qanday sahifa formatlash yo'q — printer baytlarni
//! o'zi tushunadi.

use printers::common::base::printer::Printer;
use printers::common::base::job::PrinterJobOptions;
use printers::common::converters::Converter;
use serde::Serialize;

#[derive(Serialize)]
pub struct PrinterInfo {
    /// Foydalanuvchiga ko'rsatiladigan nom.
    pub name: String,
    /// Tizimdagi haqiqiy nom — chop etishda aynan shu ishlatiladi.
    pub system_name: String,
    pub is_default: bool,
}

impl From<&Printer> for PrinterInfo {
    fn from(p: &Printer) -> Self {
        PrinterInfo {
            name: p.name.clone(),
            system_name: p.system_name.clone(),
            is_default: p.is_default,
        }
    }
}

/// Sozlamalar oynasidagi ro'yxat uchun.
#[tauri::command]
pub fn list_printers() -> Vec<PrinterInfo> {
    printers::get_printers().iter().map(PrinterInfo::from).collect()
}

/// ESC/POS baytlarini printerga yuboradi.
///
/// `printer` bo'sh bo'lsa tizimning standart printeri ishlatiladi — kafeda
/// bitta chek printeri bo'lsa sozlashning hojati qolmaydi.
#[tauri::command]
pub fn print_raw(printer: Option<String>, data: Vec<u8>) -> Result<(), String> {
    if data.is_empty() {
        return Err("Chop etish uchun ma'lumot bo'sh".into());
    }

    let target = match printer.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        Some(name) => printers::get_printer_by_name(name)
            .ok_or_else(|| format!("'{name}' nomli printer topilmadi"))?,
        None => printers::get_default_printer()
            .ok_or_else(|| "Tizimda standart printer tanlanmagan".to_string())?,
    };

    // CUPS hujjatni tanib, o'zgartirib yuborishi mumkin. `cups-raw` unga
    // baytlarga tegmaslikni aytadi. Windows'da winspool baribir RAW rejimida
    // ishlaydi, shuning uchun u yerda qo'shimcha xossa kerak emas.
    #[cfg(unix)]
    let raw_properties: &[(&str, &str)] = &[("document-format", "application/vnd.cups-raw")];
    #[cfg(not(unix))]
    let raw_properties: &[(&str, &str)] = &[];

    let options = PrinterJobOptions {
        name: Some("OrderPlus chek"),
        raw_properties,
        converter: Converter::None,
    };

    target
        .print(&data, options)
        .map(|_| ())
        .map_err(|e| format!("Printerga yuborib bo'lmadi: {e:?}"))
}

