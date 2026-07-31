import 'package:flutter_test/flutter_test.dart';
import 'package:uzbecano_pos/main.dart';

void main() {
  testWidgets('Uzbecano POS smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const UzbecanoPosApp());
    expect(find.text('UZBECANO POS'), findsOneWidget);
  });
}
