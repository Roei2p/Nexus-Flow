# Nexus-Flow — סיומת בדיקות

מריץ את כל הסוויטות ברצף ומסכם. exit code אפס = הכול ירוק.

```powershell
.\test.ps1
.\test.ps1 -SkipSlow      # מדלג על סUITות ה-LLM (איטיות)
.\test.ps1 -Only greenapi # סוויטה אחת
```

unnecessary dependency free — כל סקריפט רץ עם `node` בלבד.
