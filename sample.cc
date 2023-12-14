#include <emscripten/bind.h>

#include <string>

using namespace emscripten;

class HeavyObject {
 public:
  HeavyObject() { val_.resize(10000000, 'a'); }
  ~HeavyObject() = default;

  int len() const { return val_.size(); }

 private:
  std::string val_;
};

EMSCRIPTEN_BINDINGS(IgDemoModule) {
  class_<HeavyObject>("HeavyObject")
    .smart_ptr_constructor("HeavyObject", &std::make_shared<HeavyObject>)
    .function("len", &HeavyObject::len);
}
