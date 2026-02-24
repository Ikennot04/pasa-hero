class AuthBlocRepository {
  Future<void> test(bool isError) async {
    if (isError) {
      throw Exception('Test error from repository');
    }
    // Simulate some async work
    await Future.delayed(const Duration(milliseconds: 500));
  }
}
