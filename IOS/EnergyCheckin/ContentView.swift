import SwiftUI

struct ContentView: View {
    @StateObject private var vm = CheckinViewModel()

    var body: some View {
        NavigationView {
            VStack {
                List {
                    ForEach(Constants.sections) { sec in
                        SectionRow(sec: sec, vm: vm)
                    }
                }
                HStack(spacing: 16) {
                    Button("加载") { Task { await vm.load() } }
                        .buttonStyle(.borderedProminent)
                    Button("保存") { Task { await vm.save() } }
                        .buttonStyle(.borderedProminent)
                }
                .padding()
                Text(vm.status)
                    .font(.footnote)
                    .padding(.bottom)
            }
            .navigationTitle("Energy 打卡")
        }
    }
}

struct SectionRow: View {
    let sec: CheckinSection
    @ObservedObject var vm: CheckinViewModel

    var body: some View {
        let draft = vm.drafts[sec.key] ?? CheckinDraft(done: false, duration: 0, note: "")

        VStack(alignment: .leading, spacing: 6) {
            Toggle(sec.name, isOn: Binding(
                get: { draft.done },
                set: { vm.updateDraft(key: sec.key, draft: CheckinDraft(done: $0, duration: draft.duration, note: draft.note)) }
            ))
            HStack {
                Text("时长(分)")
                TextField("0", value: Binding(
                    get: { draft.duration },
                    set: { vm.updateDraft(key: sec.key, draft: CheckinDraft(done: draft.done, duration: $0, note: draft.note)) }
                ), format: .number)
                .textFieldStyle(.roundedBorder)
                Text("备注")
                TextField("可选", text: Binding(
                    get: { draft.note },
                    set: { vm.updateDraft(key: sec.key, draft: CheckinDraft(done: draft.done, duration: draft.duration, note: $0)) }
                ))
                .textFieldStyle(.roundedBorder)
            }
        }
        .padding(.vertical, 4)
    }
}
