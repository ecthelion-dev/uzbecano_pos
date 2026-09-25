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
//!
//! Windows da spooler muammosi: printer o'chiq bo'lsa Windows jobni spooler da
//! saqlab qoladi va printer qayta yoqilganda barcha eski joblar ketma-ket
//! bosiladi. Bu modulda WinAPI to'g'ridan-to'g'ri chaqiriladi — printer offline
//! bo'lsa `StartDocPrinter` darhol xato qaytaradi.

use printers::common::base::printer::Printer;
#[cfg(not(windows))]
use printers::common::base::job::PrinterJobOptions;
#[cfg(not(windows))]
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
///
/// Windows da WinAPI orqali to'g'ridan-to'g'ri yuboriladi: printer offline
/// bo'lsa darhol xato qaytaradi va spooler da eski joblar to'planmaydi.
#[tauri::command]
pub fn print_raw(printer: Option<String>, data: Vec<u8>) -> Result<(), String> {
    if data.is_empty() {
        return Err("Chop etish uchun ma'lumot bo'sh".into());
    }

    // Printer nomini aniqlaymiz (Windows va Unix uchun).
    let resolved_name: String = match printer.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        Some(name) => {
            printers::get_printer_by_name(name)
                .ok_or_else(|| format!("'{name}' nomli printer topilmadi"))?;
            name.to_string()
        }
        None => {
            let default = printers::get_default_printer()
                .ok_or_else(|| "Tizimda standart printer tanlanmagan".to_string())?;
            default.system_name.clone()
        }
    };

    #[cfg(windows)]
    {
        return print_raw_windows(&resolved_name, &data);
    }

    #[cfg(not(windows))]
    {
        let target = printers::get_printer_by_name(&resolved_name)
            .ok_or_else(|| format!("'{resolved_name}' nomli printer topilmadi"))?;

        // CUPS hujjatni tanib, o'zgartirib yuborishi mumkin. `cups-raw` unga
        // baytlarga tegmaslikni aytadi.
        let raw_properties: &[(&str, &str)] = &[("document-format", "application/vnd.cups-raw")];

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
}

/// Windows da WinAPI orqali to'g'ridan-to'g'ri RAW chop etish.
///
/// Printer offline bo'lsa `StartDocPrinterW` darhol xato qaytaradi — joblar
/// spooler da to'planmaydi. Bu "kassadan boshlab barcha cheklarni bosib
/// chiqarish" muammosini hal qiladi: printer yoqilganda eski joblar
/// avtomatik bosilmaydi.
#[cfg(windows)]
fn print_raw_windows(printer_name: &str, data: &[u8]) -> Result<(), String> {
    use windows::core::{PCWSTR, PWSTR};
    use windows::Win32::Graphics::Printing::{
        ClosePrinter, EndDocPrinter, EndPagePrinter, OpenPrinterW, StartDocPrinterW,
        StartPagePrinter, WritePrinter, DOC_INFO_1W, PRINTER_ACCESS_USE, PRINTER_DEFAULTSW,
        PRINTER_HANDLE,
    };

    // Printer nomini UTF-16 + null-terminator ga o'tkazamiz.
    let name_wide: Vec<u16> = printer_name.encode_utf16().chain(std::iter::once(0)).collect();

    let defaults = PRINTER_DEFAULTSW {
        DesiredAccess: PRINTER_ACCESS_USE,
        ..Default::default()
    };

    let mut handle = PRINTER_HANDLE::default();

    // Printerni ochamiz. Offline bo'lsa bu qadam ham xato qaytarishi mumkin.
    unsafe {
        OpenPrinterW(
            PCWSTR(name_wide.as_ptr()),
            &mut handle,
            Some(&defaults),
        )
        .map_err(|e| format!("Printerni ochib bo'lmadi (offline?): {e}"))?;
    }

    // DOC_INFO_1W — RAW ma'lumot turi.
    let mut doc_name: Vec<u16> = "OrderPlus chek\0".encode_utf16().collect();
    let mut data_type: Vec<u16> = "RAW\0".encode_utf16().collect();

    let doc_info = DOC_INFO_1W {
        pDocName: PWSTR(doc_name.as_mut_ptr()),
        pOutputFile: PWSTR::null(),
        pDatatype: PWSTR(data_type.as_mut_ptr()),
    };

    // StartDocPrinterW — printer tayyor bo'lmasa bu yerda xato qaytaradi.
    let job_id =
        unsafe { StartDocPrinterW(handle, 1, &doc_info as *const DOC_INFO_1W as *const _) };

    if job_id == 0 {
        unsafe {
            ClosePrinter(handle).ok();
        }
        return Err("Printer tayyor emas yoki offline (StartDocPrinter muvaffaqiyatsiz)".into());
    }

    // StartPagePrinter — sahifani boshlaymiz.
    if let Err(e) = unsafe { StartPagePrinter(handle) }.ok() {
        unsafe {
            EndDocPrinter(handle).ok();
            ClosePrinter(handle).ok();
        }
        return Err(format!("StartPagePrinter muvaffaqiyatsiz: {e}"));
    }

    // Baytlarni printerga yuboramiz.
    let mut written: u32 = 0;
    let write_result = unsafe {
        WritePrinter(
            handle,
            data.as_ptr() as *const _,
            data.len() as u32,
            &mut written,
        )
    }
    .ok()
    .map_err(|e| format!("WritePrinter muvaffaqiyatsiz: {e}"));

    // Har qanday holatda cleanup.
    unsafe {
        EndPagePrinter(handle).ok();
        EndDocPrinter(handle).ok();
        ClosePrinter(handle).ok();
    }

    write_result?;

    if written as usize != data.len() {
        return Err(format!(
            "Chala yozildi: {} / {} bayt",
            written,
            data.len()
        ));
    }

    Ok(())
}
