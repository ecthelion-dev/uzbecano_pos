mod printing;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    // Muzlatilgan kafe ekranidagi to'lov va qo'llab-quvvatlash havolalari
    // uchun. Tauri oynasida `target="_blank"` hech nima qilmaydi, oddiy
    // havola esa kassani ilovadan olib chiqib ketardi — orqaga qaytish
    // tugmasi yo'q, ya'ni xodim ilovani yopishga majbur bo'lardi.
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .invoke_handler(tauri::generate_handler![
      printing::list_printers,
      printing::print_raw,
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
