#!/usr/bin/env python3
"""
Скрипт для автоматичного оновлення інформації про GitHub репозиторії
в INFRASTRUCTURE.md та docs/infrastructure_quick_ref.ipynb

Використання:
    python scripts/update_repos_info.py
    # або
    ./scripts/update_repos_info.py
"""

import subprocess
import re
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

# Шляхи до файлів
PROJECT_ROOT = Path(__file__).parent.parent
INFRASTRUCTURE_MD = PROJECT_ROOT / "INFRASTRUCTURE.md"
INFRASTRUCTURE_NOTEBOOK = PROJECT_ROOT / "docs" / "infrastructure_quick_ref.ipynb"


def get_known_repositories() -> Dict[str, Dict[str, str]]:
    """Повертає список відомих репозиторіїв проєкту (навіть якщо remote не додано)"""
    return {
        "microdao-daarion": {
            "name": "MicroDAO",
            "ssh_url": "git@github.com:IvanTytar/microdao-daarion.git",
            "https_url": "https://github.com/IvanTytar/microdao-daarion.git",
            "remote_name": "origin",
            "main_branch": "main",
            "owner": "IvanTytar",
            "repo": "microdao-daarion",
            "is_current": True
        },
        "daarion-ai-city": {
            "name": "DAARION.city",
            "ssh_url": "git@github.com:DAARION-DAO/daarion-ai-city.git",
            "https_url": "https://github.com/DAARION-DAO/daarion-ai-city.git",
            "remote_name": "daarion-city",
            "main_branch": "main",
            "owner": "DAARION-DAO",
            "repo": "daarion-ai-city",
            "is_current": False
        }
    }


def get_git_remotes() -> Dict[str, Dict[str, str]]:
    """Витягує інформацію про git remotes з поточного репозиторію"""
    known_repos = get_known_repositories()
    remotes = {}
    
    try:
        result = subprocess.run(
            ["git", "remote", "-v"],
            capture_output=True,
            text=True,
            cwd=PROJECT_ROOT,
            check=True
        )
        
        remotes = {}
        for line in result.stdout.strip().split('\n'):
            if not line:
                continue
                
            parts = line.split()
            if len(parts) >= 2:
                remote_name = parts[0]
                url = parts[1]
                
                # Очистити URL від токенів та конвертувати
                # Видалити токени з HTTPS URL (ghp_xxx@ або token@)
                clean_url = re.sub(r'https://[^@]+@', 'https://', url)
                clean_url = re.sub(r'ghp_[^@]+@', '', clean_url)
                
                # Визначити тип URL (SSH або HTTPS)
                if url.startswith('git@') or 'git@' in clean_url:
                    # Якщо це SSH URL
                    ssh_match = re.search(r'git@github\.com:[^/]+/[^/\s]+', url)
                    if ssh_match:
                        ssh_url = ssh_match.group(0)
                    else:
                        ssh_url = clean_url.replace('https://github.com/', 'git@github.com:')
                    # Конвертувати SSH URL в HTTPS
                    https_url = ssh_url.replace('git@github.com:', 'https://github.com/')
                elif url.startswith('https://') or 'github.com' in clean_url:
                    # Якщо це HTTPS URL
                    https_match = re.search(r'https://github\.com/[^/]+/[^/\s]+', clean_url)
                    if https_match:
                        https_url = https_match.group(0)
                    else:
                        https_url = clean_url
                    # Конвертувати HTTPS URL в SSH
                    ssh_url = https_url.replace('https://github.com/', 'git@github.com:')
                else:
                    continue
                
                # Витягнути owner/repo з URL
                match = re.search(r'github\.com[:/]([^/]+)/([^/]+)', url)
                if match:
                    owner = match.group(1)
                    repo_name = match.group(2).replace('.git', '')
                    
                    # Визначити main branch
                    try:
                        branch_result = subprocess.run(
                            ["git", "remote", "show", remote_name],
                            capture_output=True,
                            text=True,
                            cwd=PROJECT_ROOT,
                            check=True
                        )
                        branch_match = re.search(r'HEAD branch:\s+(\S+)', branch_result.stdout)
                        main_branch = branch_match.group(1) if branch_match else "main"
                    except:
                        main_branch = "main"
                    
                    # Перевірити чи це відомий репозиторій
                    repo_key = None
                    for key, known_repo in known_repos.items():
                        if known_repo["repo"] == repo_name:
                            repo_key = key
                            break
                    
                    if repo_key:
                        # Використати дані з відомих репозиторіїв
                        remotes[remote_name] = known_repos[repo_key].copy()
                        remotes[remote_name]["remote_name"] = remote_name
                        remotes[remote_name]["main_branch"] = main_branch
                        remotes[remote_name]["ssh_url"] = ssh_url
                        remotes[remote_name]["https_url"] = https_url
                    else:
                        # Невідомий репозиторій - створити новий запис
                        remotes[remote_name] = {
                            "name": repo_name.replace('-', ' ').title(),
                            "ssh_url": ssh_url,
                            "https_url": https_url,
                            "remote_name": remote_name,
                            "main_branch": main_branch,
                            "owner": owner,
                            "repo": repo_name
                        }
        
        # Додати відомі репозиторії які не мають remote
        for repo_key, known_repo in known_repos.items():
            if not any(r.get("repo") == known_repo["repo"] for r in remotes.values()):
                # Якщо це поточний репозиторій, додати як origin
                if known_repo.get("is_current") and "origin" not in remotes:
                    remotes["origin"] = known_repo.copy()
                # Інакше додати з remote_name як ключ
                elif not known_repo.get("is_current"):
                    remotes[known_repo["remote_name"]] = known_repo.copy()
        
        return remotes
    except subprocess.CalledProcessError as e:
        print(f"Помилка при виконанні git команди: {e}")
        return {}
    except Exception as e:
        print(f"Неочікувана помилка: {e}")
        return {}


def get_repo_purpose(repo_name: str) -> str:
    """Визначає призначення репозиторію на основі назви"""
    purposes = {
        "microdao-daarion": "MicroDAO core code, DAGI Stack, documentation",
        "daarion-ai-city": "Official DAARION.city website and integrations"
    }
    return purposes.get(repo_name, "Project repository")


def update_infrastructure_md(remotes: Dict[str, Dict[str, str]]) -> bool:
    """Оновлює розділ про репозиторії в INFRASTRUCTURE.md"""
    if not INFRASTRUCTURE_MD.exists():
        print(f"Файл {INFRASTRUCTURE_MD} не знайдено")
        return False
    
    content = INFRASTRUCTURE_MD.read_text(encoding='utf-8')
    
    # Знайти розділ про репозиторії
    repo_section_start = content.find("## 🐙 GitHub Repositories")
    if repo_section_start == -1:
        print("Розділ про репозиторії не знайдено в INFRASTRUCTURE.md")
        return False
    
    # Знайти кінець розділу (наступний ##)
    repo_section_end = content.find("\n## ", repo_section_start + 1)
    if repo_section_end == -1:
        repo_section_end = len(content)
    
    # Створити новий розділ
    new_section = "## 🐙 GitHub Repositories\n\n"
    
    repo_num = 1
    for remote_name, repo_info in remotes.items():
        purpose = get_repo_purpose(repo_info["repo"])
        
        new_section += f"### {repo_num}. {repo_info['name']}"
        if remote_name == "origin":
            new_section += " (Current Project)"
        new_section += "\n"
        new_section += f"- **Repository:** `{repo_info['ssh_url']}`\n"
        new_section += f"- **HTTPS:** `{repo_info['https_url']}`\n"
        new_section += f"- **Remote Name:** `{repo_info['remote_name']}`\n"
        new_section += f"- **Main Branch:** `{repo_info['main_branch']}`\n"
        new_section += f"- **Purpose:** {purpose}\n\n"
        
        new_section += "**Quick Clone:**\n"
        new_section += "```bash\n"
        new_section += f"git clone {repo_info['ssh_url']}\n"
        new_section += f"cd {repo_info['repo']}\n"
        new_section += "```\n\n"
        
        repo_num += 1
    
    # Додати інструкції для додавання remote (якщо є більше одного)
    if len(remotes) > 1:
        other_remotes = [r for r in remotes.items() if r[0] != "origin"]
        if other_remotes:
            new_section += "**Add as remote to MicroDAO:**\n"
            new_section += "```bash\n"
            new_section += "cd microdao-daarion\n"
            for remote_name, repo_info in other_remotes:
                new_section += f"git remote add {repo_info['remote_name']} {repo_info['ssh_url']}\n"
                new_section += f"git fetch {repo_info['remote_name']}\n"
            new_section += "```\n\n"
    
    new_section += "---\n\n"
    
    # Замінити старий розділ
    updated_content = (
        content[:repo_section_start] +
        new_section +
        content[repo_section_end:]
    )
    
    INFRASTRUCTURE_MD.write_text(updated_content, encoding='utf-8')
    print(f"✅ Оновлено {INFRASTRUCTURE_MD}")
    return True


def update_notebook(remotes: Dict[str, Dict[str, str]]) -> bool:
    """Оновлює розділ про репозиторії в infrastructure_quick_ref.ipynb"""
    if not INFRASTRUCTURE_NOTEBOOK.exists():
        print(f"Файл {INFRASTRUCTURE_NOTEBOOK} не знайдено")
        return False
    
    try:
        notebook = json.loads(INFRASTRUCTURE_NOTEBOOK.read_text(encoding='utf-8'))
    except json.JSONDecodeError as e:
        print(f"Помилка при читанні notebook: {e}")
        return False
    
    # Знайти комірки з репозиторіями
    repo_markdown_idx = None
    repo_code_idx = None
    
    for i, cell in enumerate(notebook.get("cells", [])):
        if cell.get("cell_type") == "markdown":
            source = "".join(cell.get("source", []))
            if "## 🐙 GitHub Repositories" in source:
                repo_markdown_idx = i
        elif cell.get("cell_type") == "code":
            source = "".join(cell.get("source", []))
            if "REPOSITORIES = {" in source:
                repo_code_idx = i
    
    # Оновити markdown комірку
    if repo_markdown_idx is not None:
        new_markdown = "## 🐙 GitHub Repositories\n\n"
        repo_num = 1
        for remote_name, repo_info in remotes.items():
            purpose = get_repo_purpose(repo_info["repo"])
            new_markdown += f"### {repo_num}. {repo_info['name']}"
            if remote_name == "origin":
                new_markdown += " (Current Project)"
            new_markdown += "\n"
            new_markdown += f"- **Repository:** `{repo_info['ssh_url']}`\n"
            new_markdown += f"- **HTTPS:** `{repo_info['https_url']}`\n"
            new_markdown += f"- **Remote Name:** `{repo_info['remote_name']}`\n"
            new_markdown += f"- **Main Branch:** `{repo_info['main_branch']}`\n"
            new_markdown += f"- **Purpose:** {purpose}\n\n"
            repo_num += 1
        new_markdown += "---\n"
        
        notebook["cells"][repo_markdown_idx]["source"] = new_markdown.split("\n")
    
    # Оновити code комірку
    if repo_code_idx is not None:
        repos_dict = {}
        for remote_name, repo_info in remotes.items():
            purpose = get_repo_purpose(repo_info["repo"])
            repos_dict[repo_info["repo"]] = {
                "name": repo_info["name"],
                "ssh_url": repo_info["ssh_url"],
                "https_url": repo_info["https_url"],
                "remote_name": repo_info["remote_name"],
                "main_branch": repo_info["main_branch"],
                "purpose": purpose,
                "clone_cmd": f"git clone {repo_info['ssh_url']}"
            }
        
        new_code = "# GitHub Repositories Configuration\n"
        new_code += "REPOSITORIES = " + json.dumps(repos_dict, indent=4, ensure_ascii=False) + "\n\n"
        new_code += 'print("GitHub Repositories:")\n'
        new_code += 'print("="*80)\n'
        new_code += "for repo_id, repo in REPOSITORIES.items():\n"
        new_code += '    print(f"\\n{repo[\'name\']} ({repo_id})")\n'
        new_code += '    print(f"  SSH URL:     {repo[\'ssh_url\']}")\n'
        new_code += '    print(f"  HTTPS URL:   {repo[\'https_url\']}")\n'
        new_code += '    print(f"  Remote:      {repo[\'remote_name\']}")\n'
        new_code += '    print(f"  Branch:      {repo[\'main_branch\']}")\n'
        new_code += '    print(f"  Purpose:     {repo[\'purpose\']}")\n'
        new_code += '    print(f"  Clone:       {repo[\'clone_cmd\']}")\n\n'
        new_code += 'print("\\n" + "="*80)\n'
        new_code += 'print("\\nQuick Commands:")\n'
        new_code += 'print("\\n# Clone MicroDAO:")\n'
        new_code += 'print("git clone git@github.com:IvanTytar/microdao-daarion.git")\n'
        new_code += 'print("\\n# Clone DAARION.city:")\n'
        new_code += 'print("git clone git@github.com:DAARION-DAO/daarion-ai-city.git")\n'
        
        if len(remotes) > 1:
            other_remotes = [r for r in remotes.items() if r[0] != "origin"]
            if other_remotes:
                new_code += 'print("\\n# Add DAARION.city as remote to MicroDAO:")\n'
                new_code += 'print("cd microdao-daarion")\n'
                for remote_name, repo_info in other_remotes:
                    remote_name_val = repo_info['remote_name']
                    ssh_url_val = repo_info['ssh_url']
                    new_code += f'print("git remote add {remote_name_val} {ssh_url_val}")\n'
                    new_code += f'print("git fetch {remote_name_val}")\n'
        
        notebook["cells"][repo_code_idx]["source"] = new_code.split("\n")
    
    # Зберегти notebook
    INFRASTRUCTURE_NOTEBOOK.write_text(
        json.dumps(notebook, indent=1, ensure_ascii=False),
        encoding='utf-8'
    )
    print(f"✅ Оновлено {INFRASTRUCTURE_NOTEBOOK}")
    return True


def main():
    """Головна функція"""
    print("🔄 Оновлення інформації про GitHub репозиторії...\n")
    
    # Витягнути інформацію про remotes
    remotes = get_git_remotes()
    
    if not remotes:
        print("⚠️  Не знайдено жодного git remote")
        return 1
    
    print(f"Знайдено {len(remotes)} remote(s):")
    for remote_name, repo_info in remotes.items():
        print(f"  - {remote_name}: {repo_info['repo']}")
    print()
    
    # Оновити файли
    success_md = update_infrastructure_md(remotes)
    success_nb = update_notebook(remotes)
    
    if success_md and success_nb:
        print("\n✅ Всі файли успішно оновлено!")
        return 0
    else:
        print("\n⚠️  Деякі файли не вдалося оновити")
        return 1


if __name__ == "__main__":
    exit(main())

