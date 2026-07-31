import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

const String baseUrl = 'http://localhost:3000';

void main() {
  runApp(const UzbecanoPosApp());
}

class UzbecanoPosApp extends StatelessWidget {
  const UzbecanoPosApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Uzbecano POS',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFF97316),
          surface: Color(0xFF1E293B),
        ),
        textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
      ),
      home: const PosHomeScreen(),
    );
  }
}

class ProductItem {
  final String id;
  final String name;
  final String category;
  final String description;
  final int price;
  final String image;
  final bool isAvailable;

  ProductItem({
    required this.id,
    required this.name,
    required this.category,
    required this.description,
    required this.price,
    required this.image,
    required this.isAvailable,
  });

  factory ProductItem.fromJson(Map<String, dynamic> json) {
    return ProductItem(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      price: json['price'] is int
          ? json['price'] as int
          : (json['price'] as num?)?.toInt() ?? 0,
      image: json['image']?.toString() ?? '',
      isAvailable: json['isAvailable'] as bool? ?? true,
    );
  }
}

class CartEntry {
  final ProductItem product;
  int quantity;

  CartEntry({required this.product, this.quantity = 1});
}

class PosHomeScreen extends StatefulWidget {
  const PosHomeScreen({super.key});

  @override
  State<PosHomeScreen> createState() => _PosHomeScreenState();
}

class _PosHomeScreenState extends State<PosHomeScreen> {
  int currentTab = 0; // 0 = Stollar Zali, 1 = Buyurtma Oynasi

  List<ProductItem> products = [];
  List<String> categories = ['Barchasi'];
  String selectedCategory = 'NONE';
  String searchQuery = '';
  bool isLoading = true;

  List<CartEntry> cart = [];
  String selectedTable = 'Stol 01';
  String orderType = 'stol';
  bool isSubmittingOrder = false;

  List<dynamic> activeOrders = [];
  Map<String, dynamic> tableOrdersMap = {};

  final NumberFormat currencyFormatter = NumberFormat("#,##0", "uz_UZ");

  @override
  void initState() {
    super.initState();
    fetchData();
  }

  Future<void> fetchData() async {
    setState(() => isLoading = true);
    await fetchOrders();
    try {
      final res = await http.get(Uri.parse('$baseUrl/api/products'));
      if (res.statusCode == 200) {
        final List<dynamic> data = jsonDecode(res.body) as List<dynamic>;
        final loaded = data
            .map((e) => ProductItem.fromJson(e as Map<String, dynamic>))
            .toList();
        if (loaded.isNotEmpty) {
          final cats = <String>{'Barchasi'};
          for (final p in loaded) {
            if (p.category.isNotEmpty) cats.add(p.category);
          }
          setState(() {
            products = loaded;
            categories = cats.toList();
            isLoading = false;
          });
          return;
        }
      }
    } catch (_) {}

    // Fallback demo data
    final demoProducts = [
      ProductItem(
        id: '1',
        name: 'Uzbek Honey Latte',
        category: 'Ichimliklar',
        description: 'Qahva va asal',
        price: 28000,
        image:
            'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&q=80',
        isAvailable: true,
      ),
      ProductItem(
        id: '2',
        name: 'Mutton Shashlik',
        category: 'Shashlik',
        description: 'Lula va qiyma',
        price: 60000,
        image:
            'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&q=80',
        isAvailable: true,
      ),
      ProductItem(
        id: '3',
        name: 'Toshkent Palov (Osh)',
        category: 'Taomlar',
        description: 'Toy oshi',
        price: 45000,
        image:
            'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=500&q=80',
        isAvailable: true,
      ),
      ProductItem(
        id: '4',
        name: 'Burger Big',
        category: 'Burger',
        description: 'Sirli gushtli burger',
        price: 50000,
        image:
            'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80',
        isAvailable: true,
      ),
      ProductItem(
        id: '5',
        name: 'Pizza Salami',
        category: 'Pizza',
        description: 'Sosiska pissa',
        price: 65000,
        image:
            'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=500&q=80',
        isAvailable: true,
      ),
      ProductItem(
        id: '6',
        name: 'Pizza Vegi',
        category: 'Pizza',
        description: 'Sabzavotli pissa',
        price: 65000,
        image:
            'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&q=80',
        isAvailable: true,
      ),
    ];
    final cats = <String>{'Barchasi'};
    for (final p in demoProducts) {
      if (p.category.isNotEmpty) cats.add(p.category);
    }
    setState(() {
      products = demoProducts;
      categories = cats.toList();
      isLoading = false;
    });
  }

  Future<void> fetchOrders() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/api/orders'));
      if (res.statusCode == 200) {
        final List<dynamic> data = jsonDecode(res.body) as List<dynamic>;
        final Map<String, dynamic> tMap = {};
        for (final o in data) {
          final status = o['status']?.toString() ?? '';
          if (status != 'completed' && status != 'cancelled') {
            final tbl = o['tableNumber']?.toString();
            if (tbl != null && tbl.isNotEmpty) {
              tMap[tbl] = o;
            }
          }
        }
        setState(() {
          activeOrders = data;
          tableOrdersMap = tMap;
        });
      }
    } catch (_) {}
  }

  Future<void> _closeOrder(String orderId, String paymentMethod) async {
    try {
      final res = await http.patch(
        Uri.parse('$baseUrl/api/orders/$orderId'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'status': 'completed',
          'paymentMethod': paymentMethod,
        }),
      );
      if (res.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text("To'lov ($paymentMethod) qabul qilindi va stol bo'shatildi! ✅"),
              backgroundColor: Colors.green,
            ),
          );
        }
        await fetchOrders();
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text("Xatolik: ${res.statusCode}"),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Xatolik: $e"),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showSplitPaymentDialog(BuildContext context, String orderId, int totalAmount) {
    int cashAmount = (totalAmount / 2).round();
    final cashCtrl = TextEditingController(text: cashAmount.toString());

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSt) {
            final cVal = int.tryParse(cashCtrl.text) ?? 0;
            final cardVal = (totalAmount - cVal).clamp(0, totalAmount);
            return AlertDialog(
              title: const Text("🔀 Aralash to'lov", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text("Jami summa: ${currencyFormatter.format(totalAmount)} som", style: const TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  TextField(
                    controller: cashCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: "Naqd to'lanadigan summa (som)", border: OutlineInputBorder()),
                    onChanged: (_) => setSt(() {}),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(8)),
                    child: Text(
                      "Karta orqali: ${currencyFormatter.format(cardVal)} som",
                      style: const TextStyle(color: Colors.blue, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("BEKOR QILISH")),
                ElevatedButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    final method = "aralash (Naqd: ${currencyFormatter.format(cVal)} + Karta: ${currencyFormatter.format(cardVal)})";
                    _closeOrder(orderId, method);
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.purple),
                  child: const Text("TO'LOVNI TASDIQLASH", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void openTable(String tableName) {
    setState(() {
      selectedTable = tableName;
      cart.clear();
      currentTab = 1;
    });
  }

  void addToCart(ProductItem product) {
    final idx = cart.indexWhere((item) => item.product.id == product.id);
    setState(() {
      if (idx >= 0) {
        cart[idx].quantity += 1;
      } else {
        cart.add(CartEntry(product: product));
      }
    });
  }

  void updateQuantity(String productId, int delta) {
    final idx = cart.indexWhere((item) => item.product.id == productId);
    if (idx >= 0) {
      setState(() {
        cart[idx].quantity += delta;
        if (cart[idx].quantity <= 0) {
          cart.removeAt(idx);
        }
      });
    }
  }

  int get subtotal =>
      cart.fold(0, (sum, item) => sum + (item.product.price * item.quantity));
  int get serviceFee => (subtotal * 0.10).round();
  int get grandTotal => subtotal + serviceFee;

  Future<void> submitOrder() async {
    if (cart.isEmpty) return;
    setState(() => isSubmittingOrder = true);

    try {
      final itemsJson = jsonEncode(
        cart
            .map(
              (e) => {
                'id': e.product.id,
                'name': e.product.name,
                'price': e.product.price,
                'quantity': e.quantity,
              },
            )
            .toList(),
      );

      final res = await http.post(
        Uri.parse('$baseUrl/api/orders'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'tableNumber': selectedTable,
          'orderType': orderType,
          'items': itemsJson,
          'subtotal': subtotal,
          'serviceFee': serviceFee,
          'total': grandTotal,
          'status': 'sent_to_kitchen',
        }),
      );

      if (res.statusCode == 200 || res.statusCode == 201) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                '$selectedTable uchun buyurtma oshxonaga yuborildi! 🚀',
              ),
              backgroundColor: Colors.green,
            ),
          );
        }
        await fetchOrders();
        setState(() {
          cart.clear();
          isSubmittingOrder = false;
          currentTab = 0;
        });
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Xatolik: Server javobi ${res.statusCode}'),
              backgroundColor: Colors.red,
            ),
          );
        }
        setState(() => isSubmittingOrder = false);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Ulanish xatosi: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
      setState(() => isSubmittingOrder = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            color: const Color(0xFF1E293B),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF97316),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.restaurant,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  'UZBECANO POS',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(width: 32),
                Row(
                  children: [
                    _buildTabButton(0, Icons.table_restaurant, 'STOLLAR ZALI'),
                    const SizedBox(width: 8),
                    _buildTabButton(
                      1,
                      Icons.menu_book,
                      'KASSA VA MENYU ($selectedTable)',
                    ),
                  ],
                ),
                const Spacer(),
                ElevatedButton.icon(
                  onPressed: () => _showZReportDialog(context),
                  icon: const Icon(Icons.assessment, size: 16, color: Colors.white),
                  label: const Text('SMENANI YOPISH (Z-REPORT)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.white)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.redAccent,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(width: 12),
                IconButton(
                  onPressed: () async {
                    await fetchData();
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text("Ma'lumotlar yangilandi! 🔄"),
                          duration: Duration(seconds: 1),
                        ),
                      );
                    }
                  },
                  icon: const Icon(Icons.refresh, color: Colors.white),
                  tooltip: 'Yangilash',
                ),
              ],
            ),
          ),
          Expanded(
            child: currentTab == 0
                ? _buildTablesGridTab()
                : _buildMenuAndCheckoutTab(),
          ),
        ],
      ),
    );
  }

  Widget _buildTabButton(int index, IconData icon, String label) {
    final isSel = currentTab == index;
    return InkWell(
      onTap: () => setState(() => currentTab = index),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSel ? const Color(0xFFF97316) : const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSel ? const Color(0xFFF97316) : const Color(0xFF334155),
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 18,
              color: isSel ? Colors.white : Colors.grey[400],
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 13,
                color: isSel ? Colors.white : Colors.grey[300],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTablesGridTab() {
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Restoran Stollari Joylashuvi',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Row(
                children: [
                  _buildStatusLegend(Colors.greenAccent, 'BOSH STOL'),
                  const SizedBox(width: 16),
                  _buildStatusLegend(
                    Colors.redAccent,
                    'BAND STOL (FAOL BUYURTMA)',
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Expanded(
            child: GridView.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 8,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
                childAspectRatio: 1.15,
              ),
              itemCount: 12,
              itemBuilder: (context, index) {
                final numStr = (index + 1).toString().padLeft(2, '0');
                final tableName = 'Stol $numStr';
                final hasOrder = tableOrdersMap.containsKey(tableName);
                final orderData = tableOrdersMap[tableName];

                return InkWell(
                  onTap: () => openTable(tableName),
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: hasOrder
                          ? const Color(0xFF450A0A)
                          : const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: hasOrder
                            ? Colors.redAccent
                            : Colors.greenAccent.withValues(alpha: 0.5),
                        width: 1.5,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              tableName,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 1,
                              ),
                              decoration: BoxDecoration(
                                color: hasOrder
                                    ? Colors.redAccent
                                    : Colors.green,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                hasOrder ? 'BAND' : 'BOSH',
                                style: const TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (hasOrder && orderData != null) ...[
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Jami: ${currencyFormatter.format(orderData['total'] ?? 0)} som',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFFF97316),
                                ),
                              ),
                              Text(
                                'Holat: ${orderData['status'] ?? 'Tayyorlanmoqda'}',
                                style: const TextStyle(
                                  fontSize: 9,
                                  color: Colors.grey,
                                ),
                              ),
                            ],
                          ),
                        ] else ...[
                          const Text(
                            'Bosib buyurtma berish',
                            style: TextStyle(
                              fontSize: 10,
                              color: Colors.grey,
                            ),
                          ),
                        ],
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            ElevatedButton.icon(
                              onPressed: () => openTable(tableName),
                              icon: const Icon(Icons.add_shopping_cart, size: 12),
                              label: Text(hasOrder ? 'Tahrirlash' : 'Buyurtma Olish', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: hasOrder ? Colors.redAccent : const Color(0xFFF97316),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 2),
                                minimumSize: const Size(0, 26),
                              ),
                            ),
                            if (hasOrder) ...[
                              const SizedBox(height: 2),
                              OutlinedButton.icon(
                                onPressed: () => _showReceiptForOrder(context, tableName, orderData),
                                icon: const Icon(Icons.print, size: 12),
                                label: const Text('CHEK CHIQARISH', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold)),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Colors.white,
                                  side: const BorderSide(color: Colors.white54),
                                  padding: const EdgeInsets.symmetric(vertical: 2),
                                  minimumSize: const Size(0, 24),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusLegend(Color color, String label) {
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: Colors.grey,
          ),
        ),
      ],
    );
  }

  Widget _buildMenuAndCheckoutTab() {
    final activeCategories = categories.where((c) => c != 'Barchasi').toList();
    final isCategorySelected = selectedCategory != 'NONE' || searchQuery.isNotEmpty;

    final filteredProducts = products.where((p) {
      final matchesCat = selectedCategory == 'NONE' || selectedCategory == 'Barchasi' || p.category == selectedCategory;
      final matchesSearch = searchQuery.isEmpty || p.name.toLowerCase().contains(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    }).toList();

    return Row(
      children: [
        Expanded(
          flex: 7,
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                color: const Color(0xFF0F172A),
                child: Row(
                  children: [
                    if (isCategorySelected) ...[
                      TextButton.icon(
                        onPressed: () => setState(() {
                          selectedCategory = 'NONE';
                          searchQuery = '';
                        }),
                        icon: const Icon(Icons.arrow_back, color: Color(0xFFF97316)),
                        label: const Text(
                          'KATEGORIYALARGA QAYTISH',
                          style: TextStyle(color: Color(0xFFF97316), fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 12),
                    ] else ...[
                      TextButton.icon(
                        onPressed: () => setState(() => currentTab = 0),
                        icon: const Icon(Icons.table_restaurant, color: Colors.white70),
                        label: const Text('STOLLAR ZALI', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold)),
                      ),
                      const SizedBox(width: 12),
                    ],
                    Expanded(
                      child: SizedBox(
                        height: 38,
                        child: TextField(
                          onChanged: (String val) => setState(() {
                            searchQuery = val;
                            if (val.isNotEmpty) selectedCategory = 'NONE';
                          }),
                          decoration: InputDecoration(
                            hintText: 'Taom qidirish...',
                            prefixIcon: const Icon(Icons.search, size: 18, color: Colors.grey),
                            filled: true,
                            fillColor: const Color(0xFF1E293B),
                            contentPadding: EdgeInsets.zero,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: isLoading
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFFF97316)))
                    : _buildMenuBody(isCategorySelected, activeCategories, filteredProducts),
              ),
            ],
          ),
        ),
        Expanded(
          flex: 3,
          child: Container(
            color: const Color(0xFF1E293B),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Buyurtma Kvitansiyasi',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF97316),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        selectedTable,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: cart.isEmpty
                      ? const Center(child: Text("Kassa savatchasi bosh"))
                      : ListView.builder(
                          itemCount: cart.length,
                          itemBuilder: (BuildContext ctx, int idx) {
                            final item = cart[idx];
                            return ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text(
                                item.product.name,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              subtitle: Text(
                                "${currencyFormatter.format(item.product.price)} som",
                              ),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: const Icon(
                                      Icons.remove_circle_outline,
                                      size: 18,
                                    ),
                                    onPressed: () {
                                      updateQuantity(item.product.id, -1);
                                    },
                                  ),
                                  Text(
                                    "${item.quantity}",
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(
                                      Icons.add_circle_outline,
                                      size: 18,
                                      color: Color(0xFFF97316),
                                    ),
                                    onPressed: () {
                                      updateQuantity(item.product.id, 1);
                                    },
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                ),
                const Divider(),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Jami taomlar:'),
                    Text(
                      "${currencyFormatter.format(subtotal)} som",
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Xizmat haqi (10%):'),
                    Text(
                      "${currencyFormatter.format(serviceFee)} som",
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'JAMI:',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    Text(
                      "${currencyFormatter.format(grandTotal)} som",
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 18,
                        color: Color(0xFFF97316),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SizedBox(
                      height: 42,
                      child: ElevatedButton(
                        onPressed: (cart.isEmpty || isSubmittingOrder)
                            ? null
                            : () {
                                submitOrder();
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFF97316),
                        ),
                        child: isSubmittingOrder
                            ? const CircularProgressIndicator(color: Colors.white)
                            : const Text(
                                'OSHXONAGA YUBORISH',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                  color: Colors.white,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      height: 40,
                      child: OutlinedButton.icon(
                        onPressed: cart.isEmpty ? null : () => _showReceiptDialog(context),
                        icon: const Icon(Icons.print, size: 18),
                        label: const Text('CHEK CHIQARISH', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: const BorderSide(color: Color(0xFFF97316)),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMenuBody(bool isCategorySelected, List<String> activeCategories, List<ProductItem> filteredProducts) {
    if (!isCategorySelected) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              'MENYU KATEGORIYALARI',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white70),
            ),
          ),
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 240,
                mainAxisExtent: 140,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
              ),
              itemCount: activeCategories.length,
              itemBuilder: (context, idx) {
                final catName = activeCategories[idx];
                final catCount = products.where((p) => p.category == catName).length;
                IconData catIcon = Icons.fastfood;
                if (catName.toLowerCase().contains('ichimlik')) catIcon = Icons.local_cafe;
                if (catName.toLowerCase().contains('shashlik')) catIcon = Icons.kebab_dining;
                if (catName.toLowerCase().contains('burger')) catIcon = Icons.lunch_dining;
                if (catName.toLowerCase().contains('pizza')) catIcon = Icons.local_pizza;
                if (catName.toLowerCase().contains('taom') || catName.toLowerCase().contains('osh')) catIcon = Icons.rice_bowl;

                return InkWell(
                  onTap: () => setState(() => selectedCategory = catName),
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFF97316).withValues(alpha: 0.4), width: 1.5),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Icon(catIcon, size: 36, color: const Color(0xFFF97316)),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0F172A),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '$catCount ta',
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
                              ),
                            ),
                          ],
                        ),
                        Text(
                          catName,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 220,
        mainAxisExtent: 220,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: filteredProducts.length,
      itemBuilder: (BuildContext ctx, int idx) {
        final p = filteredProducts[idx];
        return InkWell(
          onTap: () => addToCart(p),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                    child: Container(
                      color: Colors.grey[800],
                      width: double.infinity,
                      child: p.image.isNotEmpty
                          ? Image.network(
                              p.image,
                              fit: BoxFit.cover,
                              errorBuilder: (BuildContext ctx, Object err, StackTrace? stack) {
                                return const Icon(Icons.fastfood, size: 36);
                              },
                            )
                          : const Icon(Icons.fastfood, size: 36),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        p.name,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        "${currencyFormatter.format(p.price)} som",
                        style: const TextStyle(color: Color(0xFFF97316), fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showReceiptDialog(BuildContext context) {
    final nowStr = DateFormat('dd.MM.yyyy HH:mm').format(DateTime.now());
    showDialog(
      context: context,
      builder: (BuildContext ctx) {
        return Dialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Container(
            width: 380,
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'UZBECANO RESTORAN',
                  style: TextStyle(color: Colors.black, fontWeight: FontWeight.w900, fontSize: 20),
                ),
                const SizedBox(height: 4),
                const Text("Toshkent sh., Markaziy Ko'cha 12", style: TextStyle(color: Colors.black87, fontSize: 12)),
                const Text('Tel: +998 90 123-45-67', style: TextStyle(color: Colors.black87, fontSize: 12)),
                const Divider(color: Colors.black45, thickness: 1),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Sana: $nowStr', style: const TextStyle(color: Colors.black, fontSize: 11, fontWeight: FontWeight.bold)),
                    Text(selectedTable, style: const TextStyle(color: Colors.black, fontSize: 13, fontWeight: FontWeight.w900)),
                  ],
                ),
                const Divider(color: Colors.black45, thickness: 1),
                Column(
                  children: cart.map((e) {
                    final itemTotal = e.product.price * e.quantity;
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 3),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              '${e.product.name} x${e.quantity}',
                              style: const TextStyle(color: Colors.black, fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ),
                          Text(
                            '${currencyFormatter.format(itemTotal)} som',
                            style: const TextStyle(color: Colors.black, fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
                const Divider(color: Colors.black45, thickness: 1),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Jami taomlar:', style: TextStyle(color: Colors.black87, fontSize: 12)),
                    Text('${currencyFormatter.format(subtotal)} som', style: const TextStyle(color: Colors.black, fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Xizmat haqi (10%):', style: TextStyle(color: Colors.black87, fontSize: 12)),
                    Text('${currencyFormatter.format(serviceFee)} som', style: const TextStyle(color: Colors.black, fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('JAMI TO\'LOV:', style: TextStyle(color: Colors.black, fontSize: 15, fontWeight: FontWeight.w900)),
                    Text(
                      '${currencyFormatter.format(grandTotal)} som',
                      style: const TextStyle(color: Color(0xFFF97316), fontSize: 16, fontWeight: FontWeight.w900),
                    ),
                  ],
                ),
                const Divider(color: Colors.black45, thickness: 1),
                const Text('Rahmat! Yana kutib qolamiz!', style: TextStyle(color: Colors.black54, fontSize: 11, fontStyle: FontStyle.italic)),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('YOPISH', style: TextStyle(color: Colors.grey)),
                      ),
                    ),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Chek kassa printeriga yuborildi! 🖨️'),
                              backgroundColor: Colors.blueAccent,
                            ),
                          );
                        },
                        icon: const Icon(Icons.print, size: 16, color: Colors.white),
                        label: const Text('CHOP ETISH', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.white)),
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF97316)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showReceiptForOrder(BuildContext context, String table, Map<String, dynamic>? orderData) {
    if (orderData == null) return;
    final nowStr = DateFormat('dd.MM.yyyy HH:mm').format(DateTime.now());
    List<dynamic> itemsList = [];
    try {
      final rawItems = orderData['items'];
      if (rawItems is String) {
        itemsList = jsonDecode(rawItems) as List<dynamic>;
      } else if (rawItems is List) {
        itemsList = rawItems;
      }
    } catch (_) {}

    final orderTotal = orderData['total'] ?? 0;
    final orderSubtotal = orderData['subtotal'] ?? (orderTotal * 0.9).round();
    final orderFee = orderData['serviceFee'] ?? (orderTotal * 0.1).round();

    showDialog(
      context: context,
      builder: (BuildContext ctx) {
        return Dialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Container(
            width: 380,
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'UZBECANO RESTORAN',
                  style: TextStyle(color: Colors.black, fontWeight: FontWeight.w900, fontSize: 20),
                ),
                const SizedBox(height: 4),
                const Text("Toshkent sh., Markaziy Ko'cha 12", style: TextStyle(color: Colors.black87, fontSize: 12)),
                const Text('Tel: +998 90 123-45-67', style: TextStyle(color: Colors.black87, fontSize: 12)),
                const Divider(color: Colors.black45, thickness: 1),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Sana: $nowStr', style: const TextStyle(color: Colors.black, fontSize: 11, fontWeight: FontWeight.bold)),
                    Text(table, style: const TextStyle(color: Colors.black, fontSize: 13, fontWeight: FontWeight.w900)),
                  ],
                ),
                const Divider(color: Colors.black45, thickness: 1),
                Column(
                  children: itemsList.map((e) {
                    final name = e['name']?.toString() ?? 'Taom';
                    final qty = e['quantity'] ?? 1;
                    final price = e['price'] ?? 0;
                    final lineTotal = price * qty;
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 3),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              '$name x$qty',
                              style: const TextStyle(color: Colors.black, fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ),
                          Text(
                            '${currencyFormatter.format(lineTotal)} som',
                            style: const TextStyle(color: Colors.black, fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
                const Divider(color: Colors.black45, thickness: 1),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Jami taomlar:', style: TextStyle(color: Colors.black87, fontSize: 12)),
                    Text('${currencyFormatter.format(orderSubtotal)} som', style: const TextStyle(color: Colors.black, fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Xizmat haqi (10%):', style: TextStyle(color: Colors.black87, fontSize: 12)),
                    Text('${currencyFormatter.format(orderFee)} som', style: const TextStyle(color: Colors.black, fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('JAMI TO\'LOV:', style: TextStyle(color: Colors.black, fontSize: 15, fontWeight: FontWeight.w900)),
                    Text(
                      '${currencyFormatter.format(orderTotal)} som',
                      style: const TextStyle(color: Color(0xFFF97316), fontSize: 16, fontWeight: FontWeight.w900),
                    ),
                  ],
                ),
                const Divider(color: Colors.black45, thickness: 1),
                const Text('Rahmat! Yana kutib qolamiz!', style: TextStyle(color: Colors.black54, fontSize: 11, fontStyle: FontStyle.italic)),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('ORQAGA', style: TextStyle(color: Colors.grey)),
                      ),
                    ),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Chek kassa printeriga yuborildi! 🖨️'),
                              backgroundColor: Colors.blueAccent,
                            ),
                          );
                        },
                        icon: const Icon(Icons.print, size: 16, color: Colors.white),
                        label: const Text('CHOP ETISH', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.white)),
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF97316)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text("TO'LOV USULINI TANLANG VA YOPING:", style: TextStyle(color: Colors.black87, fontSize: 11, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(ctx);
                          final orderId = orderData['id']?.toString();
                          if (orderId != null) {
                            _closeOrder(orderId, 'naqd');
                          }
                        },
                        icon: const Icon(Icons.money, size: 14, color: Colors.white),
                        label: const Text("💵 NAQD", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.white)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(ctx);
                          final orderId = orderData['id']?.toString();
                          if (orderId != null) {
                            _closeOrder(orderId, 'karta');
                          }
                        },
                        icon: const Icon(Icons.credit_card, size: 14, color: Colors.white),
                        label: const Text("💳 KARTA", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.white)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blueAccent,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(ctx);
                          final orderId = orderData['id']?.toString();
                          if (orderId != null) {
                            _closeOrder(orderId, 'click');
                          }
                        },
                        icon: const Icon(Icons.qr_code_2, size: 14, color: Colors.white),
                        label: const Text("📲 CLICK", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.white)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF009688),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(ctx);
                          final orderId = orderData['id']?.toString();
                          if (orderId != null) {
                            _closeOrder(orderId, 'payme');
                          }
                        },
                        icon: const Icon(Icons.payment, size: 14, color: Colors.white),
                        label: const Text("📲 PAYME", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.white)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF00BCD4),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(ctx);
                          final orderId = orderData['id']?.toString();
                          if (orderId != null) {
                            _showSplitPaymentDialog(context, orderId, (orderTotal as num).toInt());
                          }
                        },
                        icon: const Icon(Icons.call_split, size: 14, color: Colors.white),
                        label: const Text("🔀 ARALASH", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.white)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.purple,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showZReportDialog(BuildContext context) {
    final nowStr = DateFormat('dd.MM.yyyy HH:mm').format(DateTime.now());
    final shiftStartStr = DateFormat('dd.MM.yyyy 08:00').format(DateTime.now());

    int totalOrdersCount = activeOrders.length;
    int totalRevenue = 0;
    int totalSubtotal = 0;
    int totalServiceFee = 0;

    for (final o in activeOrders) {
      totalRevenue += (o['total'] as num?)?.toInt() ?? 0;
      totalSubtotal += (o['subtotal'] as num?)?.toInt() ?? 0;
      totalServiceFee += (o['serviceFee'] as num?)?.toInt() ?? 0;
    }

    if (totalRevenue == 0 && cart.isNotEmpty) {
      totalOrdersCount += 1;
      totalRevenue = grandTotal;
      totalSubtotal = subtotal;
      totalServiceFee = serviceFee;
    }

    showDialog(
      context: context,
      builder: (BuildContext ctx) {
        return Dialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Container(
            width: 400,
            padding: const EdgeInsets.all(22),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.redAccent,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    'Z-HISOBOT (SMENA YOPILISHI)',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ),
                const SizedBox(height: 10),
                const Text('UZBECANO RESTORAN - KASSA #01', style: TextStyle(color: Colors.black, fontWeight: FontWeight.w900, fontSize: 16)),
                const Text('Smena tushumi va yopilish hisoboti', style: TextStyle(color: Colors.black54, fontSize: 11)),
                const Divider(color: Colors.black45, thickness: 1),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Smena ochildi:', style: TextStyle(color: Colors.black87, fontSize: 11)),
                    Text(shiftStartStr, style: const TextStyle(color: Colors.black, fontSize: 11, fontWeight: FontWeight.bold)),
                  ],
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Smena yopildi:', style: TextStyle(color: Colors.black87, fontSize: 11)),
                    Text(nowStr, style: const TextStyle(color: Colors.black, fontSize: 11, fontWeight: FontWeight.bold)),
                  ],
                ),
                const Divider(color: Colors.black45, thickness: 1),
                _buildZRow('Jami buyurtmalar soni:', '$totalOrdersCount ta'),
                _buildZRow('Naqd to\'lov tushumi:', '${currencyFormatter.format(totalSubtotal)} som'),
                _buildZRow('Xizmat haqi (10%):', '${currencyFormatter.format(totalServiceFee)} som'),
                const Divider(color: Colors.black45, thickness: 1),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('JAMI KASSA TUSHUMI:', style: TextStyle(color: Colors.black, fontSize: 14, fontWeight: FontWeight.w900)),
                    Text(
                      '${currencyFormatter.format(totalRevenue)} som',
                      style: const TextStyle(color: Colors.redAccent, fontSize: 16, fontWeight: FontWeight.w900),
                    ),
                  ],
                ),
                const Divider(color: Colors.black45, thickness: 1),
                const Text('Smena yopildi va hisobot arxivlandi.', style: TextStyle(color: Colors.black54, fontSize: 11, fontStyle: FontStyle.italic)),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('BEKOR QILISH', style: TextStyle(color: Colors.grey, fontSize: 11)),
                      ),
                    ),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Smena yopildi va Z-Hisobot kassa printeridan chiqdi! 📊🖨️'),
                              backgroundColor: Colors.redAccent,
                            ),
                          );
                        },
                        icon: const Icon(Icons.print, size: 16, color: Colors.white),
                        label: const Text('Z-REPORT CHOP ETISH', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.white)),
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildZRow(String title, String val) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: const TextStyle(color: Colors.black87, fontSize: 12)),
          Text(val, style: const TextStyle(color: Colors.black, fontSize: 12, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
