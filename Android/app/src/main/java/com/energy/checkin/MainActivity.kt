package com.energy.checkin

import android.os.Bundle
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var vm: MainViewModel
    private val rowViews = mutableMapOf<String, RowRefs>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        vm = ViewModelProvider(this)[MainViewModel::class.java]

        val container = findViewById<LinearLayout>(R.id.container)
        for (sec in Constants.SECTIONS) {
            val row = layoutInflater.inflate(R.layout.row_section, container, false)
            val name = row.findViewById<TextView>(R.id.tv_name)
            val cb = row.findViewById<CheckBox>(R.id.cb_done)
            val duration = row.findViewById<EditText>(R.id.et_duration)
            val note = row.findViewById<EditText>(R.id.et_note)
            name.text = sec.name
            rowViews[sec.key] = RowRefs(cb, duration, note)
            container.addView(row)
        }

        findViewById<Button>(R.id.btn_load).setOnClickListener {
            lifecycleScope.launch { vm.load() }
        }
        findViewById<Button>(R.id.btn_save).setOnClickListener {
            collectFromUI()
            lifecycleScope.launch { vm.save(vm.drafts.value ?: emptyMap()) }
        }

        vm.drafts.observe(this) { drafts ->
            for (sec in Constants.SECTIONS) {
                val d = drafts[sec.key] ?: continue
                rowViews[sec.key]?.let { r ->
                    r.cb.isChecked = d.done
                    r.duration.setText(d.duration.toString())
                    r.note.setText(d.note)
                }
            }
        }
        vm.status.observe(this) { findViewById<TextView>(R.id.tv_status).text = it }
    }

    private fun collectFromUI() {
        for (sec in Constants.SECTIONS) {
            val r = rowViews[sec.key] ?: continue
            val draft = CheckinDraft(
                done = r.cb.isChecked,
                duration = r.duration.text.toString().toIntOrNull() ?: 0,
                note = r.note.text.toString(),
            )
            vm.updateDraft(sec.key, draft)
        }
    }

    private data class RowRefs(
        val cb: CheckBox,
        val duration: EditText,
        val note: EditText,
    )
}
