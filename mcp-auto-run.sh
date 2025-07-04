#!/bin/bash

set -e

TASK=$1
TARGET_FILE=""
MCP_DIR="gemini-mcp-example"

# 기본 옵션 값
DRY_RUN=false
BATCH_MODE=false
FILE_LIMIT=3

# 인자가 2개 이상일 때만 TARGET_FILE 설정
if [ $# -gt 1 ]; then
    TARGET_FILE=$2
    shift 2
else
    shift 1
fi

# 옵션 파싱
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --batch)
            BATCH_MODE=true
            shift
            ;;
        --limit)
            FILE_LIMIT="$2"
            shift 2
            ;;
        *)
            echo "알 수 없는 옵션: $1"
            exit 1
            ;;
    esac
done

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# YAML 프롬프트 파서 함수 (안전한 버전)
parse_yaml_prompt() {
    local yaml_file="$1"
    local code_content="$2"
    local structure_content="$3"
    local analysis_content="$4"
    
    if [ ! -f "$yaml_file" ]; then
        echo -e "${RED}❌ YAML 파일을 찾을 수 없습니다: $yaml_file${NC}"
        return 1
    fi
    
    # YAML에서 prompt 부분 추출 (| 이후의 모든 내용)
    local prompt_content=$(awk '/^prompt: \|/{flag=1; next} /^[a-zA-Z]/ && flag{flag=0} flag{print}' "$yaml_file")
    
    # 임시 파일에 프롬프트 저장
    local temp_file="$MCP_DIR/temp/current_prompt.txt"
    echo "$prompt_content" > "$temp_file"
    
    # 변수 치환 - 하나씩 안전하게 처리
    if [ -n "$code_content" ]; then
        # {{code}} 치환
        local temp_code="$MCP_DIR/temp/temp_code.txt"
        echo "$code_content" > "$temp_code"
        
        # 치환 실행
        if grep -q "{{code}}" "$temp_file" 2>/dev/null; then
            # {{code}}가 있는 라인을 찾아서 파일 내용으로 교체
            awk '/{{code}}/ {
                while ((getline line < "'"$temp_code"'") > 0) {
                    print line
                }
                close("'"$temp_code"'")
                next
            }
            {print}' "$temp_file" > "$temp_file.new" && mv "$temp_file.new" "$temp_file"
        fi
        rm -f "$temp_code"
    fi
    
    if [ -n "$structure_content" ]; then
        # {{structure}} 치환
        local temp_structure="$MCP_DIR/temp/temp_structure.txt"
        echo "$structure_content" > "$temp_structure"
        
        if grep -q "{{structure}}" "$temp_file" 2>/dev/null; then
            awk '/{{structure}}/ {
                while ((getline line < "'"$temp_structure"'") > 0) {
                    print line
                }
                close("'"$temp_structure"'")
                next
            }
            {print}' "$temp_file" > "$temp_file.new" && mv "$temp_file.new" "$temp_file"
        fi
        rm -f "$temp_structure"
    fi
    
    if [ -n "$analysis_content" ]; then
        # {{analysis}} 치환
        local temp_analysis="$MCP_DIR/temp/temp_analysis.txt"
        echo "$analysis_content" > "$temp_analysis"
        
        if grep -q "{{analysis}}" "$temp_file" 2>/dev/null; then
            awk '/{{analysis}}/ {
                while ((getline line < "'"$temp_analysis"'") > 0) {
                    print line
                }
                close("'"$temp_analysis"'")
                next
            }
            {print}' "$temp_file" > "$temp_file.new" && mv "$temp_file.new" "$temp_file"
        fi
        rm -f "$temp_analysis"
    fi
    
    # 결과 출력
    cat "$temp_file"
    
    # 임시 파일 정리
    rm -f "$temp_file" "$temp_file.new"
}

# MD 형식 멀티파일 출력 파싱 함수
parse_md_multifile_output() {
    local input_file="$1"
    local base_output_dir="$2"
    local original_filename="$3"
    
    if [ ! -f "$input_file" ]; then
        echo -e "${RED}❌ 입력 파일을 찾을 수 없습니다: $input_file${NC}"
        return 1
    fi
    
    echo -e "${BLUE}🔧 MD 형식 멀티파일 출력 파싱 중...${NC}"
    
    # 임시 작업 디렉토리
    local temp_dir="$MCP_DIR/temp/parsing"
    mkdir -p "$temp_dir"
    
    local current_file=""
    local current_content=""
    local in_code_block=false
    local files_created=0
    
    while IFS= read -r line; do
        # 파일 헤더 감지: ## 📄 파일: `filename` (빈 파일명 필터링 추가)
        if [[ "$line" =~ ^##[[:space:]]*📄[[:space:]]*파일:[[:space:]]*\`([^\`]+)\` ]]; then
            local detected_filename="${BASH_REMATCH[1]}"
            
            # 빈 파일명이나 공백만 있는 파일명 필터링
            if [ -n "$detected_filename" ] && [[ "$detected_filename" =~ [^[:space:]] ]]; then
                # 이전 파일 저장
                if [ -n "$current_file" ] && [ -n "$current_content" ]; then
                    save_parsed_file "$current_file" "$current_content" "$base_output_dir" "$original_filename"
                    files_created=$((files_created + 1))
                fi
                
                # 새 파일 시작
                current_file="$detected_filename"
                current_content=""
                in_code_block=false
                echo -e "${CYAN}  📄 파일 발견: $current_file${NC}"
            else
                echo -e "${YELLOW}  ⚠️  빈 파일명 감지됨, 건너뜀: '$detected_filename'${NC}"
            fi
            continue
        fi
        
        # 코드 블록 시작/끝 감지
        if [[ "$line" =~ ^\`\`\`(tsx|ts|typescript)?$ ]]; then
            if [ "$in_code_block" = false ]; then
                in_code_block=true
            else
                in_code_block=false
            fi
            continue
        fi
        
        # 코드 블록 내부의 내용만 수집
        if [ "$in_code_block" = true ] && [ -n "$current_file" ]; then
            current_content+="$line"$'\n'
        fi
    done < "$input_file"
    
    # 마지막 파일 저장
    if [ -n "$current_file" ] && [ -n "$current_content" ]; then
        save_parsed_file "$current_file" "$current_content" "$base_output_dir" "$original_filename"
        files_created=$((files_created + 1))
    fi
    
    echo -e "${GREEN}✅ MD 파싱 완료: ${files_created}개 파일 생성${NC}"
    
    # 임시 디렉토리 정리
    rm -rf "$temp_dir"
    
    return 0
}

# 파싱된 파일 저장 함수
save_parsed_file() {
    local filename="$1"
    local content="$2"
    local base_output_dir="$3"
    local original_filename="$4"
    
    # 파일 경로 처리
    local output_path=""
    
    if [[ "$filename" =~ ^hooks/ ]]; then
        # hooks/ 폴더 파일인 경우
        local component_dir=$(dirname "$base_output_dir")
        output_path="$component_dir/$filename"
    elif [[ "$filename" =~ / ]]; then
        # 다른 상대 경로가 있는 경우
        local component_dir=$(dirname "$base_output_dir")
        output_path="$component_dir/$filename"
    else
        # 단순 파일명인 경우 기본 경로 사용
        local dir_path=$(dirname "$base_output_dir")
        output_path="$dir_path/$filename"
    fi
    
    # 디렉토리 생성
    mkdir -p "$(dirname "$output_path")"
    
    # 내용 저장 (앞뒤 공백 제거)
    echo -n "$content" | sed '/^$/d' | sed '1s/^[[:space:]]*//' | sed '$s/[[:space:]]*$//' > "$output_path"
    
    echo -e "${GREEN}  ✅ 저장됨: $output_path${NC}"
}

# 도움말 함수
show_help() {
    echo -e "${BLUE}🚀 Gemini CLI + MCP 완전 자동화 도구 (YAML 프롬프트 활용)${NC}"
    echo ""
    echo -e "${YELLOW}사용법:${NC}"
    echo "  ./mcp-auto-run.sh [TASK] [TARGET_FILE_OR_FOLDER] [OPTIONS]"
    echo ""
    echo -e "${YELLOW}작업 유형:${NC}"
    echo "  performance  - React 성능 분석 (불필요한 리렌더링 검사)"
    echo "  refactor     - React 컴포넌트 리팩토링 (컴포넌트 폴더 컨벤션)"
    echo "  refactor-utils - Utils 파일 전용 리팩토링 (순수 함수, 타입 안전성)"
    echo "  refactor-apis  - APIs 파일 전용 리팩토링 (에러 처리, 성능, 보안)"
    echo "  refactor-store - Store 파일 전용 리팩토링 (범용 상태 관리)"
    echo "  refactor-store-zustand - Zustand Store 전용 리팩토링 (슬라이스 패턴, 미들웨어)"
    echo "  refactor-store-rtk - Redux Toolkit 전용 리팩토링 (createSlice, RTK Query)"
    echo "  testgen      - 자동 테스트 생성 (컴포넌트/로직 자동 감지)"
    echo "  testgen-component - React 컴포넌트 전용 테스트 생성"
    echo "  testgen-logic    - 로직 함수 전용 테스트 생성 (utils, api, store)"
    echo "  structure    - 폴더 구조 분석 및 개선 조언"
    echo "  migrate      - 구조 분석 후 자동 마이그레이션 스크립트 생성 및 실행"
    echo "  all          - 모든 작업 실행 (성능분석 → 리팩토링 → 구조개선 → 마이그레이션)"
    echo "  cleanup      - 에러 파일들 정리"
    echo "  quota        - API 할당량 관련 도움말"
    echo "  test-help    - 테스트 생성 및 실행 가이드"
    echo "  list         - 사용 가능한 컴포넌트 목록 표시"
    echo ""
    echo -e "${YELLOW}지원하는 파일 타입:${NC}"
    echo -e "${CYAN}  📱 React 컴포넌트${NC}    - 성능 최적화, 타입 안전성 개선"
    echo -e "${CYAN}  🔌 API 서비스${NC}        - 에러 처리, 타입 안전성, 재사용 가능한 클라이언트"
    echo -e "${CYAN}  🛠️  유틸리티 함수${NC}     - 순수 함수, 모듈화, 테스트 가능한 구조"
    echo -e "${CYAN}  🏪 상태 관리 (범용)${NC}   - Context, 자동 감지 후 최적화"
    echo -e "${CYAN}  🐻 Zustand Store${NC}     - 슬라이스 패턴, 미들웨어, 선택적 구독"
    echo -e "${CYAN}  🛠️  Redux Toolkit${NC}     - createSlice, RTK Query, 정규화된 상태"
    echo -e "${CYAN}  🔧 TypeScript 파일${NC}   - 타입 안전성, 성능 최적화"
    echo -e "${CYAN}  🧪 테스트 파일${NC}       - 포괄적 테스트 자동 생성"
    echo ""
    echo -e "${YELLOW}옵션:${NC}"
    echo "  --dry-run    - 실제 API 호출 없이 처리할 파일들만 표시"
    echo "  --batch      - 여러 파일을 하나의 요청으로 묶어서 처리 (API 절약)"
    echo "  --limit N    - 처리할 파일 개수 제한 (기본값: 3)"
    echo ""
    echo -e "${YELLOW}예시:${NC}"
    echo "  ./mcp-auto-run.sh list                                         # 사용 가능한 파일 확인"
    echo "  ./mcp-auto-run.sh refactor src/components/Header/              # React 컴포넌트 리팩토링"
    echo "  ./mcp-auto-run.sh refactor-utils src/utils/                    # Utils 파일 전용 리팩토링"
    echo "  ./mcp-auto-run.sh refactor-apis src/types/apis/                # APIs 파일 전용 리팩토링"
    echo "  ./mcp-auto-run.sh refactor-store src/store/                    # Store 파일 전용 리팩토링 (범용)"
    echo "  ./mcp-auto-run.sh refactor-store-zustand src/store/user.ts     # Zustand Store 전용"
    echo "  ./mcp-auto-run.sh refactor-store-rtk src/store/userSlice.ts    # Redux Toolkit 전용"
    echo "  ./mcp-auto-run.sh testgen src/components/Header.tsx            # 자동 테스트 생성 (타입 감지)"
    echo "  ./mcp-auto-run.sh testgen-component src/components/Modal.tsx   # React 컴포넌트 테스트"
    echo "  ./mcp-auto-run.sh testgen-logic src/utils/formatDate.ts        # 로직 함수 테스트"
    echo "  ./mcp-auto-run.sh performance src/components/Header.tsx        # 성능 분석"
    echo "  ./mcp-auto-run.sh refactor src/store/ --batch --limit 3        # store 폴더 배치 처리"
    echo "  ./mcp-auto-run.sh all --limit 1                                # 모든 작업 실행"
    echo ""
    echo -e "${YELLOW}✨ 주요 기능:${NC}"
    echo "  🎯 파일/폴더 자동 감지 및 재귀적 처리"
    echo "  🔥 TypeScript 타입 안전성 및 성능 최적화"
    echo "  📁 원본 파일 경로 구조 완전 유지"
    echo "  🗂️  폴더 지정 시 하위 모든 파일 개별 처리"
    echo "  🛡️  에러 감지 및 자동 재시도 (할당량 초과 대응)"
    echo "  📊 작업 진행률 표시"
    echo "  📝 모든 프롬프트를 YAML 파일로 관리"
    echo "  💰 API 요청 최적화 (배치 처리, 제한 설정)"
    echo "  🧪 포괄적 테스트 자동 생성 (컴포넌트/로직 분리)"
    echo ""
    echo -e "${YELLOW}🧪 테스트 생성 기능:${NC}"
    echo -e "${CYAN}  📱 컴포넌트 테스트: 렌더링, 상호작용, 성능, 접근성${NC}"
    echo -e "${CYAN}  🔧 로직 테스트: 단위 테스트, API 모킹, 상태 관리${NC}"
    echo -e "${CYAN}  🎯 자동 감지: 파일 타입에 따라 적절한 테스트 생성${NC}"
    echo -e "${CYAN}  📋 포괄적 커버리지: 에지 케이스, 에러 처리, 성능${NC}"
    echo ""
    echo -e "${YELLOW}🎯 폴더 처리 예시:${NC}"
    echo -e "${CYAN}  입력 폴더: src/components/Header/                           ${NC}"
    echo -e "${CYAN}    ├── Header.tsx        → outputs/refactored/src/components/Header/Header.tsx${NC}"
    echo -e "${CYAN}    ├── Header.module.css → (CSS 파일은 제외)${NC}"
    echo -e "${CYAN}    ├── index.ts          → outputs/refactored/src/components/Header/index.ts${NC}"
    echo -e "${CYAN}    └── types.ts          → outputs/refactored/src/components/Header/types.ts${NC}"
    echo ""
    echo -e "${YELLOW}🎯 단일 파일 처리 예시:${NC}"
    echo -e "${CYAN}  utils/fetch-api.ts     → outputs/refactored/utils/fetch-api.ts${NC}"
    echo -e "${CYAN}  types/index.ts         → outputs/refactored/types/index.ts${NC}"
    echo ""
    echo -e "${YELLOW}🧪 테스트 생성 예시:${NC}"
    echo -e "${CYAN}  src/components/Button.tsx → outputs/refactored/src/components/Button.test.tsx${NC}"
    echo -e "${CYAN}  src/utils/formatDate.ts   → outputs/refactored/src/utils/formatDate.test.ts${NC}"
    echo -e "${CYAN}  src/store/userStore.ts    → outputs/refactored/src/store/userStore.test.ts${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  API 사용량 절약 팁:${NC}"
    echo -e "${CYAN}  • --batch 옵션으로 여러 파일을 한 번에 처리${NC}"
    echo -e "${CYAN}  • --limit 옵션으로 파일 개수 제한${NC}"
    echo -e "${CYAN}  • --dry-run으로 미리 확인 후 실행${NC}"
    echo -e "${CYAN}  • list 명령으로 정확한 경로 확인${NC}"
    echo ""
}

# 사전 요구사항 확인
check_prerequisites() {
    if ! command -v gemini &> /dev/null; then
        echo -e "${RED}❌ Gemini CLI가 설치되지 않았습니다.${NC}"
        echo "다음 명령어로 설치하세요:"
        echo "npm install -g @google/generative-ai-cli"
        exit 1
    fi
    
    # Node.js 24 사용 (Gemini CLI 최적화)
    if command -v nvm &> /dev/null; then
        echo -e "${BLUE}🔧 Node.js 24로 전환 중...${NC}"
        nvm use 24 > /dev/null 2>&1 || echo -e "${YELLOW}⚠️  Node.js 24 전환 실패 (계속 진행)${NC}"
    fi
    
    echo -e "${GREEN}✅ 사전 요구사항 확인 완료${NC}"
}

# 디렉토리 설정
setup_directories() {
    echo -e "${BLUE}📁 디렉토리 설정 중...${NC}"
    
    mkdir -p $MCP_DIR/inputs/{code,context}
    mkdir -p $MCP_DIR/outputs/{performance,refactored,structure,migration,backups}
    mkdir -p $MCP_DIR/prompts
    mkdir -p $MCP_DIR/temp
    
    echo -e "${GREEN}✅ 디렉토리 설정 완료${NC}"
}

# 프로젝트 구조 추출
extract_structure() {
    echo -e "${BLUE}📂 프로젝트 구조 추출 중...${NC}"
    
    # 더 상세한 구조 정보 수집
    {
        echo "=== 프로젝트 전체 구조 ==="
        if command -v tree &> /dev/null; then
            tree -I "node_modules|.git|dist|build|*.test.*|*.spec.*" -L 4
        else
            find . -type d -not -path "*/node_modules/*" -not -path "*/.git/*" | head -30
        fi
        
        echo -e "\n=== React 파일 목록 ==="
        find . -name "*.tsx" -o -name "*.jsx" | grep -E "(components|pages|src|app)" | head -20
        
        echo -e "\n=== 패키지 정보 ==="
        if [ -f "package.json" ]; then
            cat package.json | grep -A 10 -B 5 '"dependencies"'
        fi
    } > $MCP_DIR/inputs/context/structure.txt
    
    echo -e "${GREEN}✅ 구조 추출 완료${NC}"
}

# 코드 파일 복사 (개선된 버전 - 파일 검증 및 배치 처리)
copy_code_files() {
    echo -e "${BLUE}🧩 코드 파일 복사 중...${NC}"
    
    # 기존 파일 정리
    rm -f $MCP_DIR/inputs/code/*
    
    local files_to_process=()
    
    if [ -n "$TARGET_FILE" ]; then
        if [ -f "$TARGET_FILE" ]; then
            # 단일 파일 - 지원하는 파일 타입 확장
            if [[ "$TARGET_FILE" =~ \.(tsx|jsx|ts|js)$ ]]; then
                files_to_process+=("$TARGET_FILE")
                echo -e "${GREEN}✅ $TARGET_FILE 파일 확인됨${NC}"
            else
                echo -e "${RED}❌ $TARGET_FILE은 지원하지 않는 파일 타입입니다${NC}"
                echo -e "${YELLOW}💡 지원하는 파일 타입: .tsx, .jsx, .ts, .js${NC}"
                exit 1
            fi
        elif [ -d "$TARGET_FILE" ]; then
            # 폴더 - 다양한 파일 타입들 찾기 (재귀적으로 모든 하위 파일 포함)
            echo -e "${YELLOW}🔍 $TARGET_FILE 폴더에서 코드 파일 검색 중 (하위 폴더 포함)...${NC}"
            
            # 폴더 내 모든 하위 파일들 재귀적으로 찾기
            local found_files=$(find "$TARGET_FILE" -type f \( -name "*.tsx" -o -name "*.jsx" -o -name "*.ts" -o -name "*.js" \) 2>/dev/null | grep -v node_modules | grep -v ".test." | grep -v ".spec." | grep -v ".d.ts")
            
            if [ -z "$found_files" ]; then
                echo -e "${RED}❌ $TARGET_FILE 폴더에서 코드 파일을 찾을 수 없습니다${NC}"
                echo -e "${YELLOW}💡 사용 가능한 파일 확인: ./mcp-auto-run.sh list${NC}"
                echo -e "${YELLOW}💡 폴더 내용:${NC}"
                ls -la "$TARGET_FILE" 2>/dev/null || echo "폴더에 접근할 수 없습니다"
                exit 1
            fi
            
            # 파일들을 배열에 추가
            while IFS= read -r file; do
                if [ -f "$file" ] && [[ "$file" =~ \.(tsx|jsx|ts|js)$ ]]; then
                    files_to_process+=("$file")
                fi
            done <<< "$found_files"
            
            echo -e "${GREEN}✅ ${#files_to_process[@]}개의 코드 파일 발견 (폴더 전체)${NC}"
            
            # 발견된 파일들 미리보기
            echo -e "${CYAN}📋 처리할 파일 목록:${NC}"
            for file in "${files_to_process[@]}"; do
                echo -e "${CYAN}  📄 $file${NC}"
            done
        else
            echo -e "${RED}❌ $TARGET_FILE을 찾을 수 없습니다${NC}"
            echo -e "${YELLOW}💡 사용 가능한 파일 확인: ./mcp-auto-run.sh list${NC}"
            exit 1
        fi
    else
        # 자동으로 코드 파일들 찾아서 복사
        echo -e "${YELLOW}🔍 프로젝트에서 코드 파일들을 자동으로 찾는 중...${NC}"
        
        # 다양한 경로에서 코드 파일 검색
        for search_path in "src/components" "src/pages" "src/api" "src/services" "src/utils" "src/store" "src/hooks" "src" "components" "pages" "api" "services" "utils" "store" "hooks" "."; do
            if [ -d "$search_path" ]; then
                while IFS= read -r -d '' file; do
                    if [[ "$file" =~ \.(tsx|jsx|ts|js)$ ]] && [[ ! "$file" =~ \.(test|spec|d)\. ]]; then
                        files_to_process+=("$file")
                    fi
                done < <(find "$search_path" -maxdepth 2 -name "*.tsx" -o -name "*.jsx" -o -name "*.ts" -o -name "*.js" -print0 2>/dev/null | grep -v node_modules)
                
                if [ ${#files_to_process[@]} -ge $FILE_LIMIT ]; then
                    break
                fi
            fi
        done
        
        if [ ${#files_to_process[@]} -eq 0 ]; then
            echo -e "${RED}❌ 코드 파일을 찾을 수 없습니다${NC}"
            echo -e "${YELLOW}💡 사용 가능한 파일 확인: ./mcp-auto-run.sh list${NC}"
            exit 1
        fi
    fi
    
    # 파일 개수 제한 적용
    if [ ${#files_to_process[@]} -gt $FILE_LIMIT ]; then
        echo -e "${YELLOW}⚠️  발견된 파일 ${#files_to_process[@]}개 중 처음 $FILE_LIMIT개만 처리합니다${NC}"
        files_to_process=("${files_to_process[@]:0:$FILE_LIMIT}")
    fi
    
    # Dry run 모드
    if [ "$DRY_RUN" = true ]; then
        echo -e "${CYAN}🔍 [DRY RUN] 처리할 파일들:${NC}"
        for file in "${files_to_process[@]}"; do
            local file_type=""
            if [[ "$file" =~ \.tsx$ ]]; then
                file_type="📱 React 컴포넌트"
            elif [[ "$file" =~ \.jsx$ ]]; then
                file_type="📱 React 컴포넌트"
            elif [[ "$file" =~ api|service ]] && [[ "$file" =~ \.ts$ ]]; then
                file_type="🔌 API 서비스"
            elif [[ "$file" =~ util|helper ]] && [[ "$file" =~ \.ts$ ]]; then
                file_type="🛠️ 유틸리티"
            elif [[ "$file" =~ store|context ]] && [[ "$file" =~ \.ts$ ]]; then
                file_type="🏪 상태 관리"
            elif [[ "$file" =~ \.ts$ ]]; then
                file_type="🔧 TypeScript"
            elif [[ "$file" =~ \.js$ ]]; then
                file_type="📜 JavaScript"
            else
                file_type="📄 코드 파일"
            fi
            echo -e "${CYAN}  $file_type $file${NC}"
        done
        echo -e "${YELLOW}💡 실제 실행하려면 --dry-run 옵션을 제거하세요${NC}"
    fi
    
    # 파일 복사
    local copied_count=0
    for file in "${files_to_process[@]}"; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            cp "$file" "$MCP_DIR/inputs/code/$filename"
            echo -e "${GREEN}  📄 $filename 복사됨${NC}"
            copied_count=$((copied_count + 1))
        fi
    done
    
    echo -e "${GREEN}✅ 총 ${copied_count}개 파일 복사 완료 (API 요청 절약: $copied_count개 → ${BATCH_MODE:+1}${BATCH_MODE:+$copied_count}개 요청)${NC}"
}

# 에러 검증 및 재시도 함수 (개선된 버전)
validate_and_retry() {
    local command="$1"
    local output_file="$2"
    local task_name="$3"
    local max_retries=3
    
    for attempt in $(seq 1 $max_retries); do
        echo -e "${YELLOW}🔄 $task_name 시도 $attempt/$max_retries...${NC}"
        
        # 출력 파일 초기화
        > "$output_file"
        
        if eval "$command" > "$output_file" 2>&1; then
            # 성공 검증 - 파일이 존재하고 비어있지 않은지 확인
            if [ -s "$output_file" ]; then
                # 실제 API 에러 패턴만 체크 (정상적인 코드 내용 제외)
                # 1. 파일 시작 부분에 실제 API 에러가 있는지 확인
                # 2. Gemini API 특정 에러 메시지 확인
                # 3. HTTP 상태 에러 확인
                if head -10 "$output_file" | grep -q "Quota exceeded\|GaxiosError\|failed with status 429\|API key not valid\|PERMISSION_DENIED\|INVALID_ARGUMENT" 2>/dev/null; then
                    echo -e "${RED}❌ $task_name 시도 $attempt 실패: API 할당량 초과 또는 에러 발생${NC}"
                    
                    # 429 에러인 경우 더 긴 대기 시간
                    if head -10 "$output_file" | grep -q "429\|Quota exceeded" 2>/dev/null; then
                        if [ $attempt -lt $max_retries ]; then
                            local wait_time=$((attempt * 30))  # 30초, 60초, 90초
                            echo -e "${YELLOW}⏳ API 할당량 초과 - ${wait_time}초 대기 후 재시도...${NC}"
                            sleep $wait_time
                        fi
                    else
                        # 일반 에러인 경우 짧은 대기
                        if [ $attempt -lt $max_retries ]; then
                            local wait_time=$((attempt * 5))
                            echo -e "${YELLOW}⏳ ${wait_time}초 대기 후 재시도...${NC}"
                            sleep $wait_time
                        fi
                    fi
                # 빈 응답이나 너무 짧은 응답 체크
                elif [ $(wc -l < "$output_file") -lt 10 ]; then
                    echo -e "${RED}❌ $task_name 시도 $attempt 실패: 응답이 너무 짧음 ($(wc -l < "$output_file")줄)${NC}"
                    if [ $attempt -lt $max_retries ]; then
                        local wait_time=$((attempt * 10))
                        echo -e "${YELLOW}⏳ ${wait_time}초 대기 후 재시도...${NC}"
                        sleep $wait_time
                    fi
                else
                    echo -e "${GREEN}✅ $task_name 성공${NC}"
                    return 0
                fi
            else
                echo -e "${RED}❌ $task_name 시도 $attempt 실패: 빈 응답${NC}"
                if [ $attempt -lt $max_retries ]; then
                    local wait_time=$((attempt * 10))
                    echo -e "${YELLOW}⏳ ${wait_time}초 대기 후 재시도...${NC}"
                    sleep $wait_time
                fi
            fi
        else
            echo -e "${RED}❌ $task_name 시도 $attempt 실패: 명령어 실행 오류${NC}"
            if [ $attempt -lt $max_retries ]; then
                local wait_time=$((attempt * 5))
                echo -e "${YELLOW}⏳ ${wait_time}초 대기 후 재시도...${NC}"
                sleep $wait_time
            fi
        fi
    done
    
    echo -e "${RED}❌ $task_name 최대 재시도 횟수 초과${NC}"
    echo -e "${YELLOW}💡 할당량 초과인 경우 나중에 다시 시도하거나 다른 API 키를 사용하세요${NC}"
    return 1
}

# 성능 분석 실행 (YAML 프롬프트 사용 + 배치 모드)
run_performance_analysis() {
    echo -e "${BLUE}⚡ React 성능 분석 실행 중 (YAML 프롬프트 활용)...${NC}"
    
    local yaml_file="$MCP_DIR/prompts/performance.yaml"
    if [ ! -f "$yaml_file" ]; then
        echo -e "${RED}❌ 성능 분석 YAML 파일을 찾을 수 없습니다: $yaml_file${NC}"
        return 1
    fi
    
    local files=($MCP_DIR/inputs/code/*.tsx $MCP_DIR/inputs/code/*.jsx)
    local valid_files=()
    
    # 유효한 파일들만 필터링
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            valid_files+=("$file")
        fi
    done
    
    if [ ${#valid_files[@]} -eq 0 ]; then
        echo -e "${YELLOW}⚠️  분석할 파일이 없습니다${NC}"
        return 1
    fi
    
    echo -e "${CYAN}📊 총 ${#valid_files[@]}개 파일 분석 예정 (API 절약 모드: ${BATCH_MODE})${NC}"
    
    if [ "$BATCH_MODE" = true ]; then
        # 배치 모드: 모든 파일을 하나의 요청으로 처리
        echo -e "${CYAN}🔄 배치 모드로 모든 파일 한번에 분석 중...${NC}"
        
        local combined_code=""
        local file_names=()
        
        for file in "${valid_files[@]}"; do
            local filename=$(basename "$file" .tsx)
            filename=$(basename "$filename" .jsx)
            file_names+=("$filename")
            
            local code_content=$(cat "$file")
            combined_code+="\n\n=== $filename 컴포넌트 ===\n"
            combined_code+="$code_content"
        done
        
        local structure_content=$(cat "$MCP_DIR/inputs/context/structure.txt")
        local prompt_content=$(parse_yaml_prompt "$yaml_file" "$combined_code" "$structure_content")
        
        # 배치 분석용 프롬프트 추가
        echo "$prompt_content" > "$MCP_DIR/temp/performance_batch_prompt.txt"
        echo -e "\n\n**추가 지시사항:**" >> "$MCP_DIR/temp/performance_batch_prompt.txt"
        echo -e "- 각 컴포넌트별로 분석 결과를 명확히 구분해서 작성해주세요" >> "$MCP_DIR/temp/performance_batch_prompt.txt"
        echo -e "- 컴포넌트 이름을 제목으로 사용해주세요" >> "$MCP_DIR/temp/performance_batch_prompt.txt"
        echo -e "- 모든 답변은 한국어로 작성해주세요" >> "$MCP_DIR/temp/performance_batch_prompt.txt"
        
        # 배치 분석 실행
        local output_file="$MCP_DIR/outputs/performance/batch_analysis.md"
        local command="cat '$MCP_DIR/temp/performance_batch_prompt.txt' | gemini"
        
        if validate_and_retry "$command" "$output_file" "배치 성능 분석"; then
            echo -e "${GREEN}✅ 배치 성능 분석 완료 (${#valid_files[@]}개 파일, 1개 API 요청)${NC}"
            echo -e "${YELLOW}📄 결과 파일: $output_file${NC}"
        else
            echo -e "${RED}❌ 배치 성능 분석 실패${NC}"
        fi
    else
        # 개별 모드: 각 파일을 별도로 처리 (기존 방식)
        for file in "${valid_files[@]}"; do
            local filename=$(basename "$file" .tsx)
            filename=$(basename "$filename" .jsx)
            
            echo -e "${CYAN}🔍 $filename 분석 중...${NC}"
            
            local code_content=$(cat "$file")
            local structure_content=$(cat "$MCP_DIR/inputs/context/structure.txt")
            local prompt_content=$(parse_yaml_prompt "$yaml_file" "$code_content" "$structure_content")
            
            echo "$prompt_content" > "$MCP_DIR/temp/performance_prompt.txt"
            echo -e "\n**모든 답변은 한국어로 작성해주세요.**" >> "$MCP_DIR/temp/performance_prompt.txt"
            
            local output_file="$MCP_DIR/outputs/performance/${filename}.performance.md"
            local command="cat '$MCP_DIR/temp/performance_prompt.txt' | gemini"
            
            if validate_and_retry "$command" "$output_file" "성능 분석"; then
                echo -e "${GREEN}✅ $filename 성능 분석 완료${NC}"
            else
                echo -e "${RED}❌ $filename 성능 분석 실패${NC}"
            fi
        done
    fi
}

# 리팩토링 실행 (YAML 프롬프트 사용 + 동일 경로 출력)
run_refactoring() {
    echo -e "${BLUE}🔧 React 컴포넌트 리팩토링 실행 중 (컴포넌트 폴더 컨벤션)...${NC}"
    
    local yaml_file="$MCP_DIR/prompts/refactor.yaml"
    if [ ! -f "$yaml_file" ]; then
        echo -e "${RED}❌ 리팩토링 YAML 파일을 찾을 수 없습니다: $yaml_file${NC}"
        return 1
    fi
    
    # 디버그: 입력 디렉토리 확인
    echo -e "${YELLOW}🔍 입력 디렉토리 확인...${NC}"
    ls -la "$MCP_DIR/inputs/code/"
    
    # 파일 패턴 수정 및 디버그 로깅 추가
    local files=()
    while IFS= read -r -d '' file; do
        if [[ -f "$file" ]]; then
            files+=("$file")
            echo -e "${GREEN}  ✓ 발견된 파일: $file${NC}"
        fi
    done < <(find "$MCP_DIR/inputs/code" -type f \( -name "*.tsx" -o -name "*.jsx" -o -name "*.ts" -o -name "*.js" \) -print0)
    
    if [ ${#files[@]} -eq 0 ]; then
        echo -e "${RED}⚠️  리팩토링할 파일이 없습니다${NC}"
        echo -e "${YELLOW}💡 입력 디렉토리를 확인해주세요: $MCP_DIR/inputs/code/${NC}"
        return 1
    fi
    
    echo -e "${CYAN}📊 총 ${#files[@]}개 React 컴포넌트 리팩토링 예정${NC}"
    
    # 각 파일을 개별적으로 리팩토링하고 동일한 경로로 출력
    for file in "${files[@]}"; do
        local filename=$(basename "$file")
        local original_path=""
        
        # 원본 파일 경로 찾기 (개선된 로직)
        if [ -n "$TARGET_FILE" ]; then
            if [ -f "$TARGET_FILE" ]; then
                # 단일 파일인 경우
                original_path="$TARGET_FILE"
            elif [ -d "$TARGET_FILE" ]; then
                # 폴더인 경우, 해당 폴더 내에서 파일명으로 원본 경로 찾기
                original_path=$(find "$TARGET_FILE" -name "$filename" -type f | head -1)
                if [ -z "$original_path" ]; then
                    # 파일명이 중복될 수 있으므로 더 정확한 매칭 시도
                    original_path=$(find "$TARGET_FILE" -type f \( -name "*.tsx" -o -name "*.jsx" -o -name "*.ts" -o -name "*.js" \) | grep "$filename" | head -1)
                fi
            fi
        else
            # 자동 검색인 경우, 파일명으로 원본 경로 찾기
            original_path=$(find . -name "$filename" -not -path "*/node_modules/*" -not -path "*/$MCP_DIR/*" -type f | head -1)
        fi
        
        # 출력 경로 설정 (원본 경로 구조 유지)
        local output_path=""
        if [ -n "$original_path" ]; then
            # 원본 경로에서 상대 경로 추출
            local relative_path="${original_path#./}"
            output_path="$MCP_DIR/outputs/refactored/$relative_path"
        else
            # 원본 경로를 찾을 수 없는 경우 기본 경로 사용
            echo -e "${YELLOW}⚠️  $filename의 원본 경로를 찾을 수 없어 기본 경로를 사용합니다${NC}"
            output_path="$MCP_DIR/outputs/refactored/$filename"
        fi
        
        echo -e "${CYAN}🔄 $filename 리팩토링 중...${NC}"
        echo -e "${YELLOW}   원본: $original_path${NC}"
        echo -e "${YELLOW}   출력: $output_path${NC}"
        
        # 파일 내용 읽기
        if [ ! -f "$file" ]; then
            echo -e "${RED}❌ 파일을 찾을 수 없습니다: $file${NC}"
            continue
        fi
        
        local code_content=$(cat "$file")
        local structure_content=$(cat "$MCP_DIR/inputs/context/structure.txt")
        local prompt_content=$(parse_yaml_prompt "$yaml_file" "$code_content" "$structure_content")
        
        # 리팩토링용 프롬프트에 추가 지시사항
        echo "$prompt_content" > "$MCP_DIR/temp/refactor_prompt.txt"
        
        # 출력 디렉토리 생성
        mkdir -p "$(dirname "$output_path")"
        
        # 리팩토링 실행
        local temp_output="$MCP_DIR/temp/refactor_output.md"
        local command="cat '$MCP_DIR/temp/refactor_prompt.txt' | gemini"
        
        if validate_and_retry "$command" "$temp_output" "리팩토링"; then
            # MD 형식인지 확인
            if grep -q "## 📄 파일:" "$temp_output" 2>/dev/null; then
                echo -e "${BLUE}🔧 MD 형식 감지 - 멀티파일 파싱 시작${NC}"
                if parse_md_multifile_output "$temp_output" "$output_path" "$filename"; then
                    echo -e "${GREEN}✅ $filename 멀티파일 리팩토링 완료${NC}"
                else
                    echo -e "${YELLOW}⚠️  MD 파싱 실패 - 단일 파일로 저장${NC}"
                    cp "$temp_output" "$output_path"
                fi
            else
                # 단일 파일 출력
                cp "$temp_output" "$output_path"
                echo -e "${GREEN}✅ $filename 단일파일 리팩토링 완료${NC}"
            fi
            
            echo -e "${YELLOW}📁 개선된 파일: $output_path${NC}"
            
            # 리팩토링 결과 요약
            echo -e "${BLUE}📊 리팩토링 결과:${NC}"
            if [ -d "$(dirname "$output_path")/hooks" ]; then
                echo -e "${CYAN}  🪝 커스텀 훅 생성됨: $(dirname "$output_path")/hooks/${NC}"
                ls -la "$(dirname "$output_path")/hooks/" | grep -v "^total" | awk '{print "    📄 " $9}' | grep -v "^    📄 $"
            fi
            echo -e "${CYAN}  📱 메인 컴포넌트: $output_path${NC}"
            
        else
            echo -e "${RED}❌ $filename 리팩토링 실패${NC}"
        fi
        
        # 파일 간 간격 (API 부하 방지)
        if [ ${#files[@]} -gt 1 ]; then
            echo -e "${BLUE}⏳ 3초 대기 (API 부하 방지)...${NC}"
            sleep 3
        fi
    done
}

# 구조 분석 실행 (YAML 프롬프트 사용)
run_structure_analysis() {
    echo -e "${BLUE}📊 프로젝트 구조 분석 실행 중 (YAML 프롬프트 활용)...${NC}"
    
    local yaml_file="$MCP_DIR/prompts/folder_analysis.yaml"
    if [ ! -f "$yaml_file" ]; then
        echo -e "${RED}❌ 구조 분석 YAML 파일을 찾을 수 없습니다: $yaml_file${NC}"
        return 1
    fi
    
    if [ ! -f "$MCP_DIR/inputs/context/structure.txt" ]; then
        echo -e "${YELLOW}⚠️  구조 파일이 없어서 다시 추출합니다${NC}"
        extract_structure
    fi
    
    echo -e "${CYAN}🔍 구조 분석 중...${NC}"
    
    # 구조 내용 읽기 (이스케이프 처리 제거)
    local structure_content=$(cat "$MCP_DIR/inputs/context/structure.txt")
    
    # YAML 프롬프트 파싱 (folder_analysis.yaml은 structure 변수만 사용)
    local prompt_content=$(parse_yaml_prompt "$yaml_file" "" "$structure_content")
    
    # 프롬프트를 임시 파일에 저장
    echo "$prompt_content" > "$MCP_DIR/temp/structure_prompt.txt"
    echo -e "\n**모든 답변은 한국어로 작성해주세요.**" >> "$MCP_DIR/temp/structure_prompt.txt"
    
    # 구조 분석 실행
    local output_file="$MCP_DIR/outputs/structure/analysis.md"
    local command="cat '$MCP_DIR/temp/structure_prompt.txt' | gemini"
    
    if validate_and_retry "$command" "$output_file" "구조 분석"; then
        echo -e "${GREEN}✅ 구조 분석 완료 (YAML 프롬프트 사용)${NC}"
        return 0
    else
        echo -e "${RED}❌ 구조 분석 실패${NC}"
        return 1
    fi
}

# 마이그레이션 스크립트 생성 및 실행 (YAML 프롬프트 사용)
run_migration() {
    echo -e "${BLUE}🚀 마이그레이션 스크립트 생성 및 실행 (YAML 프롬프트 활용)${NC}"
    
    local yaml_file="$MCP_DIR/prompts/migration.yaml"
    if [ ! -f "$yaml_file" ]; then
        echo -e "${RED}❌ 마이그레이션 YAML 파일을 찾을 수 없습니다: $yaml_file${NC}"
        return 1
    fi
    
    # 구조 분석이 없으면 먼저 실행
    if [ ! -f "$MCP_DIR/outputs/structure/analysis.md" ]; then
        echo -e "${YELLOW}📊 구조 분석을 먼저 실행합니다...${NC}"
        if ! run_structure_analysis; then
            echo -e "${RED}❌ 구조 분석 실패로 마이그레이션을 중단합니다${NC}"
            return 1
        fi
    fi
    
    echo -e "${CYAN}🔧 마이그레이션 스크립트 생성 중...${NC}"
    
    # 구조 및 분석 내용 읽기 (이스케이프 처리 제거)
    local structure_content=$(cat "$MCP_DIR/inputs/context/structure.txt")
    local analysis_content=$(cat "$MCP_DIR/outputs/structure/analysis.md")
    
    # YAML 프롬프트 파싱 및 변수 치환 (migration.yaml은 structure, analysis 변수 사용)
    local prompt_content=$(parse_yaml_prompt "$yaml_file" "" "$structure_content" "$analysis_content")
    
    # 프롬프트를 임시 파일에 저장
    echo "$prompt_content" > "$MCP_DIR/temp/migration_prompt.txt"
    
    # 마이그레이션 스크립트 생성
    local migration_script="$MCP_DIR/outputs/migration/migrate_project.sh"
    local command="cat '$MCP_DIR/temp/migration_prompt.txt' | gemini"
    
    if validate_and_retry "$command" "$migration_script" "마이그레이션 스크립트 생성"; then
        chmod +x "$migration_script"
        echo -e "${GREEN}✅ 마이그레이션 스크립트 생성 완료 (YAML 프롬프트 사용)${NC}"
        echo -e "${YELLOW}📄 생성된 스크립트: $migration_script${NC}"
        
        # 실행 여부 확인
        echo ""
        echo -e "${YELLOW}⚠️  마이그레이션을 지금 실행하시겠습니까?${NC}"
        echo -e "${YELLOW}   (프로젝트 구조가 변경되며 백업이 생성됩니다)${NC}"
        echo -e "${CYAN}   [y/N]: ${NC}"
        read -r response
        
        if [[ "$response" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}🚀 마이그레이션 실행 중...${NC}"
            echo ""
            
            if bash "$migration_script"; then
                echo ""
                echo -e "${GREEN}🎉 마이그레이션 성공!${NC}"
                echo -e "${GREEN}✅ 프로젝트 구조가 최적화되었습니다${NC}"
            else
                echo ""
                echo -e "${RED}❌ 마이그레이션 실행 실패${NC}"
                echo -e "${YELLOW}💡 백업에서 복원하려면 생성된 rollback 스크립트를 실행하세요${NC}"
            fi
        else
            echo -e "${YELLOW}💡 수동으로 마이그레이션을 실행하려면:${NC}"
            echo -e "${CYAN}   bash $migration_script${NC}"
        fi
    else
        echo -e "${RED}❌ 마이그레이션 스크립트 생성 실패${NC}"
        return 1
    fi
}

# 에러 파일 정리 (개선된 버전)
cleanup_errors() {
    echo -e "${BLUE}🧹 에러 파일들 정리 중...${NC}"
    
    local cleaned_count=0
    local quota_errors=0
    
    # 에러가 포함된 파일들 찾아서 분석 및 삭제
    find "$MCP_DIR/outputs" -type f \( -name "*.md" -o -name "*.tsx" -o -name "*.sh" \) 2>/dev/null | while read file; do
        if [ -f "$file" ] && grep -q "Error\|error\|Quota exceeded\|GaxiosError\|failed with status" "$file" 2>/dev/null; then
            # 할당량 에러인지 확인
            if grep -q "Quota exceeded\|429" "$file" 2>/dev/null; then
                echo -e "${YELLOW}🚫 할당량 초과 에러 파일 삭제: $(basename "$file")${NC}"
                quota_errors=$((quota_errors + 1))
            else
                echo -e "${YELLOW}🗑️  일반 에러 파일 삭제: $(basename "$file")${NC}"
            fi
            rm -f "$file"
            cleaned_count=$((cleaned_count + 1))
        fi
    done
    
    # 빈 파일들 삭제
    find "$MCP_DIR/outputs" -type f -empty -delete 2>/dev/null
    
    # 임시 파일들 정리
    rm -f $MCP_DIR/temp/* 2>/dev/null
    
    echo -e "${GREEN}✅ 파일 정리 완료 (총 ${cleaned_count}개 파일 정리)${NC}"
    
    if [ $quota_errors -gt 0 ]; then
        echo -e "${YELLOW}⚠️  할당량 초과 에러가 ${quota_errors}개 발견되었습니다${NC}"
        show_quota_help
    fi
}

# 할당량 관련 도움말
show_quota_help() {
    echo ""
    echo -e "${YELLOW}📊 Gemini API 할당량 초과 해결 방법:${NC}"
    echo ""
    echo -e "${CYAN}1. 할당량 확인:${NC}"
    echo -e "   • Google Cloud Console에서 할당량 상태 확인"
    echo -e "   • https://console.cloud.google.com/apis/api/generativeai.googleapis.com/quotas"
    echo ""
    echo -e "${CYAN}2. 대기 후 재시도:${NC}"
    echo -e "   • 일일 할당량인 경우: 다음 날 다시 시도"
    echo -e "   • 분당 할당량인 경우: 몇 분 후 재시도"
    echo ""
    echo -e "${CYAN}3. 할당량 증가 요청:${NC}"
    echo -e "   • Google Cloud Console에서 할당량 증가 요청"
    echo -e "   • 유료 계정으로 업그레이드 고려"
    echo ""
    echo -e "${CYAN}4. 대안:${NC}"
    echo -e "   • 다른 Google 계정의 API 키 사용"
    echo -e "   • 파일을 나누어서 작은 단위로 처리"
    echo -e "   • 직접 Gemini 웹사이트에서 분석"
    echo ""
    echo -e "${YELLOW}💡 현재 상태 확인:${NC}"
    echo -e "${CYAN}   gemini --version${NC}"
    echo -e "${CYAN}   gemini config list${NC}"
    echo ""
}

# 결과 요약 출력
show_results() {
    echo ""
    echo -e "${GREEN}🎉 작업 완료! 결과를 확인하세요:${NC}"
    echo ""
    
    # 성능 분석 결과
    if [ -d "$MCP_DIR/outputs/performance" ] && [ "$(ls -A $MCP_DIR/outputs/performance 2>/dev/null)" ]; then
        local perf_count=$(ls -1 $MCP_DIR/outputs/performance/*.md 2>/dev/null | wc -l)
        echo -e "${BLUE}⚡ 성능 분석 결과 ($perf_count개):${NC}"
        echo -e "${PURPLE}   📝 YAML 프롬프트 사용${NC}"
        ls -la $MCP_DIR/outputs/performance/ | grep -v "^total" | awk '{print "  📄 " $9}' | grep -v "^  📄 $"
    fi
    
    # 리팩토링 결과 (개선된 표시)
    if [ -d "$MCP_DIR/outputs/refactored" ] && [ "$(find $MCP_DIR/outputs/refactored -type f 2>/dev/null)" ]; then
        echo -e "${BLUE}🔧 리팩토링 결과:${NC}"
        echo -e "${PURPLE}   📱 원본 경로 구조 유지 + TypeScript 최적화${NC}"
        
        # 리팩토링된 파일들을 원본 경로 구조로 표시
        find $MCP_DIR/outputs/refactored -type f | while read file; do
            local relative_path="${file#$MCP_DIR/outputs/refactored/}"
            if [[ "$file" =~ \.test\.(ts|tsx)$ ]]; then
                echo -e "  🧪 $relative_path (테스트 파일)"
            else
                echo -e "  📄 $relative_path"
            fi
        done
    fi
    
    # 테스트 생성 결과
    if [ -d "$MCP_DIR/outputs/refactored" ] && [ "$(find $MCP_DIR/outputs/refactored -name "*.test.*" -type f 2>/dev/null)" ]; then
        local test_count=$(find $MCP_DIR/outputs/refactored -name "*.test.*" -type f 2>/dev/null | wc -l)
        echo -e "${BLUE}🧪 테스트 생성 결과 ($test_count개):${NC}"
        echo -e "${PURPLE}   🎯 자동 감지 + 포괄적 테스트 커버리지${NC}"
        
        # 테스트 파일들만 별도로 표시
        find $MCP_DIR/outputs/refactored -name "*.test.*" -type f | while read test_file; do
            local relative_path="${test_file#$MCP_DIR/outputs/refactored/}"
            local test_lines=$(wc -l < "$test_file" 2>/dev/null || echo "0")
            
            # 테스트 타입 감지
            local test_type=""
            if grep -q "describe.*Component" "$test_file" 2>/dev/null; then
                test_type="📱 컴포넌트"
            elif grep -q "describe.*Api\|describe.*Service" "$test_file" 2>/dev/null; then
                test_type="🔌 API"
            elif grep -q "describe.*Store\|describe.*useStore" "$test_file" 2>/dev/null; then
                test_type="🏪 상태관리"
            elif grep -q "describe.*use[A-Z]" "$test_file" 2>/dev/null; then
                test_type="🪝 훅"
            else
                test_type="🔧 로직"
            fi
            
            echo -e "  $test_type $relative_path (${test_lines}줄)"
        done
    fi
    
    # 구조 분석 결과
    if [ -d "$MCP_DIR/outputs/structure" ] && [ "$(ls -A $MCP_DIR/outputs/structure 2>/dev/null)" ]; then
        echo -e "${BLUE}📊 구조 분석 결과:${NC}"
        echo -e "${PURPLE}   📝 YAML 프롬프트 사용${NC}"
        ls -la $MCP_DIR/outputs/structure/ | grep -v "^total" | awk '{print "  📄 " $9}' | grep -v "^  📄 $"
    fi
    
    # 마이그레이션 스크립트
    if [ -d "$MCP_DIR/outputs/migration" ] && [ "$(ls -A $MCP_DIR/outputs/migration 2>/dev/null)" ]; then
        local migration_count=$(ls -1 $MCP_DIR/outputs/migration/*.sh 2>/dev/null | wc -l)
        echo -e "${BLUE}🚀 마이그레이션 스크립트 ($migration_count개):${NC}"
        echo -e "${PURPLE}   🛠️  실행 가능한 shell 스크립트 + YAML 프롬프트${NC}"
        ls -la $MCP_DIR/outputs/migration/ | grep -v "^total" | awk '{print "  📄 " $9}' | grep -v "^  📄 $"
    fi
    
    echo ""
    echo -e "${YELLOW}💡 다음 단계:${NC}"
    echo -e "${CYAN}  1. outputs/refactored/ 폴더에서 개선된 파일들을 확인하세요${NC}"
    echo -e "${CYAN}  2. 생성된 테스트 파일들을 검토하고 실행하세요${NC}"
    echo -e "${CYAN}  3. 개선된 코드를 원본 파일에 적용하세요${NC}"
    echo -e "${CYAN}  4. 프로젝트가 정상 빌드되는지 확인하세요${NC}"
    echo -e "${CYAN}  5. 성능 분석 결과를 검토하세요${NC}"
    echo ""
    echo -e "${YELLOW}🔧 유용한 명령어:${NC}"
    echo -e "${CYAN}  ./mcp-auto-run.sh cleanup     # 에러 파일들 정리${NC}"
    echo -e "${CYAN}  ./mcp-auto-run.sh migrate     # 구조 개선 실행${NC}"
    echo -e "${CYAN}  npm test                      # 생성된 테스트 실행${NC}"
    echo -e "${CYAN}  npm run test:coverage         # 테스트 커버리지 확인${NC}"
    echo ""
    echo -e "${YELLOW}📝 YAML 프롬프트 파일:${NC}"
    echo -e "${CYAN}  📄 $MCP_DIR/prompts/performance.yaml${NC}"
    echo -e "${CYAN}  📄 $MCP_DIR/prompts/refactor.yaml${NC}"
    echo -e "${CYAN}  📄 $MCP_DIR/prompts/testgen.yaml${NC}"
    echo -e "${CYAN}  📄 $MCP_DIR/prompts/testgen-component.yaml${NC}"
    echo -e "${CYAN}  📄 $MCP_DIR/prompts/testgen-logic.yaml${NC}"
    echo -e "${CYAN}  📄 $MCP_DIR/prompts/folder_analysis.yaml${NC}"
    echo -e "${CYAN}  📄 $MCP_DIR/prompts/migration.yaml${NC}"
    echo ""
    echo -e "${YELLOW}🧪 테스트 실행 예시:${NC}"
    echo -e "${CYAN}  # Vitest 사용하는 경우${NC}"
    echo -e "${CYAN}  npx vitest run                # 모든 테스트 실행${NC}"
    echo -e "${CYAN}  npx vitest --coverage         # 커버리지와 함께 실행${NC}"
    echo -e "${CYAN}  npx vitest --ui               # UI 모드로 실행${NC}"
    echo ""
    echo -e "${CYAN}  # Jest 사용하는 경우${NC}"
    echo -e "${CYAN}  npm test                      # 모든 테스트 실행${NC}"
    echo -e "${CYAN}  npm test -- --coverage        # 커버리지와 함께 실행${NC}"
    echo -e "${CYAN}  npm test -- --watch           # 감시 모드로 실행${NC}"
    echo ""
}

# Utils 전용 리팩토링 실행
run_utils_refactoring() {
    echo -e "${BLUE}🛠️ Utils 파일 전용 리팩토링 실행 중 (순수 함수 + 타입 안전성)...${NC}"
    
    local yaml_file="$MCP_DIR/prompts/refactor-utils.yaml"
    if [ ! -f "$yaml_file" ]; then
        echo -e "${RED}❌ Utils 리팩토링 YAML 파일을 찾을 수 없습니다: $yaml_file${NC}"
        return 1
    fi
    
    run_specialized_refactoring "$yaml_file" "Utils"
}

# APIs 전용 리팩토링 실행
run_apis_refactoring() {
    echo -e "${BLUE}🔌 APIs 파일 전용 리팩토링 실행 중 (에러 처리 + 성능 + 보안)...${NC}"
    
    local yaml_file="$MCP_DIR/prompts/refactor-apis.yaml"
    if [ ! -f "$yaml_file" ]; then
        echo -e "${RED}❌ APIs 리팩토링 YAML 파일을 찾을 수 없습니다: $yaml_file${NC}"
        return 1
    fi
    
    run_specialized_refactoring "$yaml_file" "APIs"
}

# Store 전용 리팩토링 실행
run_store_refactoring() {
    echo -e "${BLUE}🏪 Store 파일 전용 리팩토링 실행 중 (불변성 + 비동기 처리)...${NC}"
    
    local yaml_file="$MCP_DIR/prompts/refactor-store.yaml"
    if [ ! -f "$yaml_file" ]; then
        echo -e "${RED}❌ Store 리팩토링 YAML 파일을 찾을 수 없습니다: $yaml_file${NC}"
        return 1
    fi
    
    run_specialized_refactoring "$yaml_file" "Store"
}

# Store 리팩토링 함수 - Zustand 전용
run_store_zustand_refactoring() {
    echo -e "${BLUE}🐻 Zustand Store 전용 리팩토링 실행 중 (슬라이스 패턴 + 성능 최적화)...${NC}"
    
    local yaml_file="$MCP_DIR/prompts/refactor-store-zustand.yaml"
    run_specialized_refactoring "$yaml_file" "Zustand Store"
}

# Store 리팩토링 함수 - Redux Toolkit 전용
run_store_rtk_refactoring() {
    echo -e "${BLUE}🛠️ Redux Toolkit Store 전용 리팩토링 실행 중 (createSlice + RTK Query)...${NC}"
    
    local yaml_file="$MCP_DIR/prompts/refactor-store-rtk.yaml"
    run_specialized_refactoring "$yaml_file" "Redux Toolkit Store"
}

# 공통 전문화된 리팩토링 함수
run_specialized_refactoring() {
    local yaml_file="$1"
    local type_name="$2"
    
    # 디버그: 입력 디렉토리 확인
    echo -e "${YELLOW}🔍 입력 디렉토리 확인...${NC}"
    ls -la "$MCP_DIR/inputs/code/"
    
    # 파일 패턴 수정 및 디버그 로깅 추가
    local files=()
    while IFS= read -r -d '' file; do
        if [[ -f "$file" ]]; then
            files+=("$file")
            echo -e "${GREEN}  ✓ 발견된 파일: $file${NC}"
        fi
    done < <(find "$MCP_DIR/inputs/code" -type f \( -name "*.tsx" -o -name "*.jsx" -o -name "*.ts" -o -name "*.js" \) -print0)
    
    if [ ${#files[@]} -eq 0 ]; then
        echo -e "${RED}⚠️  리팩토링할 파일이 없습니다${NC}"
        echo -e "${YELLOW}💡 입력 디렉토리를 확인해주세요: $MCP_DIR/inputs/code/${NC}"
        return 1
    fi
    
    echo -e "${CYAN}📊 총 ${#files[@]}개 $type_name 파일 리팩토링 예정${NC}"
    
    # Dry run 모드 체크 추가
    if [ "$DRY_RUN" = true ]; then
        echo -e "${CYAN}🔍 [DRY RUN] 처리할 $type_name 파일들:${NC}"
        for file in "${files[@]}"; do
            local filename=$(basename "$file")
            local original_path=""
            
            # 원본 파일 경로 찾기
            if [ -n "$TARGET_FILE" ]; then
                if [ -f "$TARGET_FILE" ]; then
                    original_path="$TARGET_FILE"
                elif [ -d "$TARGET_FILE" ]; then
                    original_path=$(find "$TARGET_FILE" -name "$filename" -type f | head -1)
                fi
            else
                original_path=$(find . -name "$filename" -not -path "*/node_modules/*" -not -path "*/$MCP_DIR/*" -type f | head -1)
            fi
            
            local file_type=""
            if [[ "$type_name" == "Utils" ]]; then
                file_type="🛠️ 유틸리티"
            elif [[ "$type_name" == "APIs" ]]; then
                file_type="🔌 API 서비스"
            elif [[ "$type_name" == "Store" ]] || [[ "$type_name" == "Zustand Store" ]] || [[ "$type_name" == "Redux Toolkit Store" ]]; then
                file_type="🏪 $type_name"
            else
                file_type="📄 $type_name"
            fi
            
            echo -e "${CYAN}  $file_type ${original_path:-$filename}${NC}"
            
            # 예상 출력 파일 경로 표시
            local output_path=""
            if [ -n "$original_path" ]; then
                local relative_path="${original_path#./}"
                output_path="$MCP_DIR/outputs/refactored/$relative_path"
            else
                output_path="$MCP_DIR/outputs/refactored/$filename"
            fi
            
            echo -e "${YELLOW}    → 예상 출력: $output_path${NC}"
            
            # 예상 MD 구조 파일도 표시
            local base_filename=$(basename "$filename" .ts)
            base_filename=$(basename "$base_filename" .tsx)
            local md_filename=""
            
            if [[ "$type_name" == "Utils" ]]; then
                md_filename="${base_filename}_utils_refactored.md"
            elif [[ "$type_name" == "APIs" ]]; then
                md_filename="${base_filename}_apis_refactored.md"
            elif [[ "$type_name" == "Store" ]]; then
                md_filename="${base_filename}_store_refactored.md"
            elif [[ "$type_name" == "Zustand Store" ]]; then
                md_filename="${base_filename}_zustand_refactored.md"
            elif [[ "$type_name" == "Redux Toolkit Store" ]]; then
                md_filename="${base_filename}_rtk_refactored.md"
            else
                md_filename="${base_filename}_refactored.md"
            fi
            
            echo -e "${PURPLE}    → 구조 MD: $MCP_DIR/outputs/refactored/$md_filename${NC}"
        done
        echo -e "${YELLOW}💡 실제 실행하려면 --dry-run 옵션을 제거하세요${NC}"
        echo -e "${BLUE}📋 실행 시 생성될 파일들:${NC}"
        echo -e "${CYAN}  • 리팩토링된 실제 파일 (.ts/.tsx)${NC}"
        echo -e "${CYAN}  • 구조 설명 MD 파일 (.md)${NC}"
        echo -e "${CYAN}  • JSDoc 문서화 포함${NC}"
        echo -e "${CYAN}  • 타입 안전성 강화${NC}"
        
        # dry-run이어도 샘플 MD 파일 생성
        echo -e "${BLUE}🔧 샘플 MD 파일 생성 중...${NC}"
        for file in "${files[@]}"; do
            local filename=$(basename "$file")
            local base_filename=$(basename "$filename" .ts)
            base_filename=$(basename "$base_filename" .tsx)
            local md_filename=""
            
            if [[ "$type_name" == "Utils" ]]; then
                md_filename="${base_filename}_utils_refactored.md"
            elif [[ "$type_name" == "APIs" ]]; then
                md_filename="${base_filename}_apis_refactored.md"
            elif [[ "$type_name" == "Store" ]]; then
                md_filename="${base_filename}_store_refactored.md"
            elif [[ "$type_name" == "Zustand Store" ]]; then
                md_filename="${base_filename}_zustand_refactored.md"
            elif [[ "$type_name" == "Redux Toolkit Store" ]]; then
                md_filename="${base_filename}_rtk_refactored.md"
            else
                md_filename="${base_filename}_refactored.md"
            fi
            
            local md_path="$MCP_DIR/outputs/refactored/$md_filename"
            
            # 샘플 MD 파일 내용 생성
            cat > "$md_path" << EOF
# $type_name 리팩토링 미리보기

## 📄 원본 파일: \`$filename\`

**[DRY RUN 모드]** 이 파일은 실제 API 호출 없이 생성된 샘플입니다.

### 🔧 적용될 리팩토링 패턴:

EOF

            # 타입별 상세 정보 추가
            if [[ "$type_name" == "Utils" ]]; then
                cat >> "$md_path" << EOF
#### 🛠️ Utils 파일 최적화:
- ✅ 순수 함수 패턴 적용
- ✅ 타입 안전성 강화
- ✅ 에러 처리 개선
- ✅ JSDoc 문서화
- ✅ Result 패턴 적용
- ✅ 테스트 용이한 구조

#### 예상 개선사항:
- 함수형 프로그래밍 원칙
- 불변성 보장
- 명확한 타입 정의
- 에러 핸들링 표준화
EOF
            elif [[ "$type_name" == "Zustand Store" ]]; then
                cat >> "$md_path" << EOF
#### 🐻 Zustand Store 최적화:
- ✅ 슬라이스 패턴 적용
- ✅ 미들웨어 활용 (devtools, persist, immer)
- ✅ 선택적 구독으로 성능 최적화
- ✅ 타입 안전한 상태 정의
- ✅ 비동기 상태 래퍼
- ✅ 옵티미스틱 업데이트

#### 예상 개선사항:
- 관심사 분리 (상태 vs 액션)
- 불필요한 리렌더링 방지
- 메모이제이션된 셀렉터
- 액션 함수 안정화
EOF
            elif [[ "$type_name" == "Redux Toolkit Store" ]]; then
                cat >> "$md_path" << EOF
#### 🛠️ Redux Toolkit 최적화:
- ✅ createSlice로 보일러플레이트 최소화
- ✅ RTK Query로 서버 상태 관리
- ✅ 정규화된 상태 구조
- ✅ 메모이제이션된 셀렉터
- ✅ 낙관적 업데이트
- ✅ 타입 안전한 액션

#### 예상 개선사항:
- 불변성 자동 처리 (Immer)
- 캐싱 및 무효화 전략
- 타입화된 훅 활용
- 성능 최적화된 구독
EOF
            elif [[ "$type_name" == "APIs" ]]; then
                cat >> "$md_path" << EOF
#### 🔌 API 서비스 최적화:
- ✅ 에러 처리 표준화
- ✅ 재시도 로직 구현
- ✅ 타입 안전한 요청/응답
- ✅ 보안 강화 (인증, 검증)
- ✅ 성능 최적화 (캐싱, 배치)
- ✅ 모니터링 및 로깅

#### 예상 개선사항:
- Result 패턴으로 에러 처리
- 재사용 가능한 API 클라이언트
- 요청 취소 및 정리
- 타임아웃 및 재시도
EOF
            else
                cat >> "$md_path" << EOF
#### 📄 일반 코드 최적화:
- ✅ 타입 안전성 강화
- ✅ 성능 최적화
- ✅ 코드 품질 개선
- ✅ 문서화 추가
EOF
            fi
            
            cat >> "$md_path" << EOF

### 🚀 실제 실행 방법:
\`\`\`bash
# 실제 리팩토링 실행 (API 호출)
./mcp-auto-run.sh $(echo "$TASK") $filename

# 또는 dry-run 옵션 제거
./mcp-auto-run.sh $(echo "$TASK") $filename
\`\`\`

### ⚠️ 주의사항:
- 이 파일은 DRY RUN 모드에서 생성된 샘플입니다
- 실제 리팩토링 결과와 다를 수 있습니다
- API 할당량이 복구된 후 실제 실행을 권장합니다

---
*생성 시간: $(date)*
*명령어: $TASK $TARGET_FILE --dry-run*
EOF
            
            echo -e "${GREEN}  ✅ 샘플 MD 생성: $md_filename${NC}"
        done
        
        return 0
    fi
    
    # 각 파일을 개별적으로 리팩토링
    for file in "${files[@]}"; do
        local filename=$(basename "$file")
        local original_path=""
        
        # 원본 파일 경로 찾기
        if [ -n "$TARGET_FILE" ]; then
            if [ -f "$TARGET_FILE" ]; then
                original_path="$TARGET_FILE"
            elif [ -d "$TARGET_FILE" ]; then
                original_path=$(find "$TARGET_FILE" -name "$filename" -type f | head -1)
                if [ -z "$original_path" ]; then
                    original_path=$(find "$TARGET_FILE" -type f \( -name "*.tsx" -o -name "*.jsx" -o -name "*.ts" -o -name "*.js" \) | grep "$filename" | head -1)
                fi
            fi
        else
            original_path=$(find . -name "$filename" -not -path "*/node_modules/*" -not -path "*/$MCP_DIR/*" -type f | head -1)
        fi
        
        # 출력 경로 설정
        local output_path=""
        if [ -n "$original_path" ]; then
            # 원본 경로에서 상대 경로 추출
            local relative_path="${original_path#./}"
            output_path="$MCP_DIR/outputs/refactored/$relative_path"
        else
            # 원본 경로를 찾을 수 없는 경우 기본 경로 사용
            echo -e "${YELLOW}⚠️  $filename의 원본 경로를 찾을 수 없어 기본 경로를 사용합니다${NC}"
            output_path="$MCP_DIR/outputs/refactored/$filename"
        fi
        
        echo -e "${CYAN}🔄 $filename ($type_name) 리팩토링 중...${NC}"
        echo -e "${YELLOW}   원본: $original_path${NC}"
        echo -e "${YELLOW}   출력: $output_path${NC}"
        
        # 파일 내용 읽기
        if [ ! -f "$file" ]; then
            echo -e "${RED}❌ 파일을 찾을 수 없습니다: $file${NC}"
            continue
        fi
        
        local code_content=$(cat "$file")
        local structure_content=$(cat "$MCP_DIR/inputs/context/structure.txt")
        local prompt_content=$(parse_yaml_prompt "$yaml_file" "$code_content" "$structure_content")
        
        # 리팩토링용 프롬프트 저장
        echo "$prompt_content" > "$MCP_DIR/temp/refactor_prompt.txt"
        
        # 출력 디렉토리 생성
        mkdir -p "$(dirname "$output_path")"
        
        # 리팩토링 실행
        local temp_output="$MCP_DIR/temp/refactor_output.md"
        local command="cat '$MCP_DIR/temp/refactor_prompt.txt' | gemini"
        
        if validate_and_retry "$command" "$temp_output" "$type_name 리팩토링"; then
            # MD 형식인지 확인하고 파싱 처리
            if grep -q "## 📄 파일:" "$temp_output" 2>/dev/null; then
                echo -e "${BLUE}🔧 MD 형식 감지 - 순수 코드 추출 중${NC}"
                
                # MD에서 순수 코드만 추출
                local pure_code_file="$MCP_DIR/temp/pure_code.ts"
                local in_code_block=false
                
                > "$pure_code_file"  # 파일 초기화
                
                while IFS= read -r line; do
                    # 코드 블록 시작/끝 감지
                    if [[ "$line" =~ ^\`\`\`(tsx|ts|typescript)?$ ]]; then
                        if [ "$in_code_block" = false ]; then
                            in_code_block=true
                        else
                            in_code_block=false
                        fi
                        continue
                    fi
                    
                    # 코드 블록 내부의 내용만 추출
                    if [ "$in_code_block" = true ]; then
                        echo "$line" >> "$pure_code_file"
                    fi
                done < "$temp_output"
                
                # 순수 코드 파일을 최종 출력 경로로 복사
                if [ -s "$pure_code_file" ]; then
                    cp "$pure_code_file" "$output_path"
                    echo -e "${GREEN}✅ $filename ($type_name) 순수 코드 추출 완료${NC}"
                else
                    echo -e "${YELLOW}⚠️  코드 추출 실패 - 원본 MD 파일 저장${NC}"
                    cp "$temp_output" "$output_path"
                fi
                
                rm -f "$pure_code_file"
            else
                # 단일 파일 출력 (MD 형식이 아닌 경우)
                cp "$temp_output" "$output_path"
                echo -e "${GREEN}✅ $filename ($type_name) 단일파일 리팩토링 완료${NC}"
            fi
            
            echo -e "${YELLOW}📁 개선된 파일: $output_path${NC}"
            
            # 리팩토링 결과 요약
            echo -e "${BLUE}📊 리팩토링 결과:${NC}"
            if [ -d "$(dirname "$output_path")/hooks" ]; then
                echo -e "${CYAN}  🪝 커스텀 훅 생성됨: $(dirname "$output_path")/hooks/${NC}"
                ls -la "$(dirname "$output_path")/hooks/" | grep -v "^total" | awk '{print "    📄 " $9}' | grep -v "^    📄 $"
            fi
            echo -e "${CYAN}  📱 메인 컴포넌트: $output_path${NC}"
            
        else
            echo -e "${RED}❌ $filename ($type_name) 리팩토링 실패${NC}"
        fi
        
        # 파일 간 간격 (API 부하 방지)
        if [ ${#files[@]} -gt 1 ]; then
            echo -e "${BLUE}⏳ 3초 대기 (API 부하 방지)...${NC}"
            sleep 3
        fi
    done
}

# 테스트 생성 실행 (자동 감지)
run_testgen() {
    echo -e "${BLUE}🧪 자동 테스트 생성 실행 중 (파일 타입 자동 감지)...${NC}"
    
    local yaml_file="$MCP_DIR/prompts/testgen.yaml"
    if [ ! -f "$yaml_file" ]; then
        echo -e "${RED}❌ 테스트 생성 YAML 파일을 찾을 수 없습니다: $yaml_file${NC}"
        return 1
    fi
    
    run_specialized_testgen "$yaml_file" "자동 감지 테스트"
}

# 컴포넌트 테스트 생성 실행
run_testgen_component() {
    echo -e "${BLUE}📱 React 컴포넌트 테스트 생성 실행 중 (렌더링 + 상호작용 + 성능 + 접근성)...${NC}"
    
    local yaml_file="$MCP_DIR/prompts/testgen-component.yaml"
    if [ ! -f "$yaml_file" ]; then
        echo -e "${RED}❌ 컴포넌트 테스트 YAML 파일을 찾을 수 없습니다: $yaml_file${NC}"
        return 1
    fi
    
    run_specialized_testgen "$yaml_file" "React 컴포넌트 테스트"
}

# 로직 테스트 생성 실행
run_testgen_logic() {
    echo -e "${BLUE}🔧 로직 함수 테스트 생성 실행 중 (단위 테스트 + API 모킹 + 상태 관리)...${NC}"
    
    local yaml_file="$MCP_DIR/prompts/testgen-logic.yaml"
    if [ ! -f "$yaml_file" ]; then
        echo -e "${RED}❌ 로직 테스트 YAML 파일을 찾을 수 없습니다: $yaml_file${NC}"
        return 1
    fi
    
    run_specialized_testgen "$yaml_file" "로직 함수 테스트"
}

# 공통 전문화된 테스트 생성 함수
run_specialized_testgen() {
    local yaml_file="$1"
    local type_name="$2"
    
    # 디버그: 입력 디렉토리 확인
    echo -e "${YELLOW}🔍 입력 디렉토리 확인...${NC}"
    ls -la "$MCP_DIR/inputs/code/"
    
    # 파일 패턴 수정 및 디버그 로깅 추가
    local files=()
    while IFS= read -r -d '' file; do
        if [[ -f "$file" ]]; then
            files+=("$file")
            echo -e "${GREEN}  ✓ 발견된 파일: $file${NC}"
        fi
    done < <(find "$MCP_DIR/inputs/code" -type f \( -name "*.tsx" -o -name "*.jsx" -o -name "*.ts" -o -name "*.js" \) -print0)
    
    if [ ${#files[@]} -eq 0 ]; then
        echo -e "${RED}⚠️  테스트 생성할 파일이 없습니다${NC}"
        echo -e "${YELLOW}💡 입력 디렉토리를 확인해주세요: $MCP_DIR/inputs/code/${NC}"
        return 1
    fi
    
    echo -e "${CYAN}📊 총 ${#files[@]}개 파일에 대한 $type_name 생성 예정${NC}"
    
    # Dry run 모드 체크 추가
    if [ "$DRY_RUN" = true ]; then
        echo -e "${CYAN}🔍 [DRY RUN] 생성할 $type_name 파일들:${NC}"
        for file in "${files[@]}"; do
            local filename=$(basename "$file")
            local original_path=""
            
            # 원본 파일 경로 찾기
            if [ -n "$TARGET_FILE" ]; then
                if [ -f "$TARGET_FILE" ]; then
                    original_path="$TARGET_FILE"
                elif [ -d "$TARGET_FILE" ]; then
                    original_path=$(find "$TARGET_FILE" -name "$filename" -type f | head -1)
                fi
            else
                original_path=$(find . -name "$filename" -not -path "*/node_modules/*" -not -path "*/$MCP_DIR/*" -type f | head -1)
            fi
            
            local file_type=""
            local test_type=""
            if [[ "$filename" =~ \.(tsx|jsx)$ ]]; then
                file_type="📱 React 컴포넌트"
                test_type="렌더링, 상호작용, 성능, 접근성 테스트"
            elif [[ "$filename" =~ api|service ]] && [[ "$filename" =~ \.ts$ ]]; then
                file_type="🔌 API 서비스"
                test_type="HTTP 모킹, 에러 처리, 재시도 로직 테스트"
            elif [[ "$filename" =~ util|helper ]] && [[ "$filename" =~ \.ts$ ]]; then
                file_type="🛠️ 유틸리티"
                test_type="순수 함수, 에지 케이스, 성능 테스트"
            elif [[ "$filename" =~ store|context ]] && [[ "$filename" =~ \.ts$ ]]; then
                file_type="🏪 상태 관리"
                test_type="액션, 상태 변화, 비동기 처리 테스트"
            elif [[ "$filename" =~ \.ts$ ]]; then
                file_type="🔧 TypeScript"
                test_type="단위 테스트, 타입 안전성 테스트"
            elif [[ "$filename" =~ \.js$ ]]; then
                file_type="📜 JavaScript"
                test_type="단위 테스트, 에러 처리 테스트"
            else
                file_type="📄 코드 파일"
                test_type="기본 테스트"
            fi
            
            echo -e "${CYAN}  $file_type ${original_path:-$filename}${NC}"
            echo -e "${YELLOW}    → $test_type${NC}"
            
            # 예상 테스트 파일 경로 표시
            local test_filename=""
            if [[ "$filename" =~ \.(tsx|jsx)$ ]]; then
                test_filename="${filename%.*}.test.tsx"
            else
                test_filename="${filename%.*}.test.ts"
            fi
            
            local test_output_path=""
            if [ -n "$original_path" ]; then
                local relative_path="${original_path%/*}"
                test_output_path="$MCP_DIR/outputs/refactored/$relative_path/$test_filename"
            else
                test_output_path="$MCP_DIR/outputs/refactored/$test_filename"
            fi
            
            echo -e "${PURPLE}    → 테스트 파일: $test_output_path${NC}"
        done
        echo -e "${YELLOW}💡 실제 실행하려면 --dry-run 옵션을 제거하세요${NC}"
        echo -e "${BLUE}📋 실행 시 생성될 테스트들:${NC}"
        echo -e "${CYAN}  • 포괄적 테스트 케이스 (.test.ts/.test.tsx)${NC}"
        echo -e "${CYAN}  • Mock 및 테스트 유틸리티 포함${NC}"
        echo -e "${CYAN}  • 에지 케이스 및 에러 시나리오 커버${NC}"
        echo -e "${CYAN}  • 성능 및 접근성 테스트 포함${NC}"
        
        return 0
    fi
    
    # 각 파일을 개별적으로 테스트 생성
    for file in "${files[@]}"; do
        local filename=$(basename "$file")
        local original_path=""
        
        # 원본 파일 경로 찾기
        if [ -n "$TARGET_FILE" ]; then
            if [ -f "$TARGET_FILE" ]; then
                original_path="$TARGET_FILE"
            elif [ -d "$TARGET_FILE" ]; then
                original_path=$(find "$TARGET_FILE" -name "$filename" -type f | head -1)
                if [ -z "$original_path" ]; then
                    original_path=$(find "$TARGET_FILE" -type f \( -name "*.tsx" -o -name "*.jsx" -o -name "*.ts" -o -name "*.js" \) | grep "$filename" | head -1)
                fi
            fi
        else
            original_path=$(find . -name "$filename" -not -path "*/node_modules/*" -not -path "*/$MCP_DIR/*" -type f | head -1)
        fi
        
        # 테스트 파일 경로 설정
        local test_filename=""
        if [[ "$filename" =~ \.(tsx|jsx)$ ]]; then
            test_filename="${filename%.*}.test.tsx"
        else
            test_filename="${filename%.*}.test.ts"
        fi
        
        local test_output_path=""
        if [ -n "$original_path" ]; then
            # 원본 파일과 같은 디렉토리에 테스트 파일 생성
            local relative_dir="${original_path%/*}"
            test_output_path="$MCP_DIR/outputs/refactored/$relative_dir/$test_filename"
        else
            # 원본 경로를 찾을 수 없는 경우 기본 경로 사용
            echo -e "${YELLOW}⚠️  $filename의 원본 경로를 찾을 수 없어 기본 경로를 사용합니다${NC}"
            test_output_path="$MCP_DIR/outputs/refactored/$test_filename"
        fi
        
        echo -e "${CYAN}🔄 $filename ($type_name) 생성 중...${NC}"
        echo -e "${YELLOW}   원본: $original_path${NC}"
        echo -e "${YELLOW}   테스트: $test_output_path${NC}"
        
        # 파일 내용 읽기
        if [ ! -f "$file" ]; then
            echo -e "${RED}❌ 파일을 찾을 수 없습니다: $file${NC}"
            continue
        fi
        
        local code_content=$(cat "$file")
        local structure_content=$(cat "$MCP_DIR/inputs/context/structure.txt")
        local prompt_content=$(parse_yaml_prompt "$yaml_file" "$code_content" "$structure_content")
        
        # 테스트 생성용 프롬프트 저장
        echo "$prompt_content" > "$MCP_DIR/temp/testgen_prompt.txt"
        
        # 출력 디렉토리 생성
        mkdir -p "$(dirname "$test_output_path")"
        
        # 테스트 생성 실행
        local temp_output="$MCP_DIR/temp/testgen_output.md"
        local command="cat '$MCP_DIR/temp/testgen_prompt.txt' | gemini"
        
        if validate_and_retry "$command" "$temp_output" "$type_name 생성"; then
            # MD 형식인지 확인하고 순수 코드 추출
            if grep -q "## 📄 파일:" "$temp_output" 2>/dev/null; then
                echo -e "${BLUE}🔧 MD 형식 감지 - 순수 테스트 코드 추출 중${NC}"
                
                # MD에서 순수 코드만 추출
                local pure_test_file="$MCP_DIR/temp/pure_test.ts"
                local in_code_block=false
                
                > "$pure_test_file"  # 파일 초기화
                
                while IFS= read -r line; do
                    # 코드 블록 시작/끝 감지
                    if [[ "$line" =~ ^\`\`\`(tsx|ts|typescript)?$ ]]; then
                        if [ "$in_code_block" = false ]; then
                            in_code_block=true
                        else
                            in_code_block=false
                        fi
                        continue
                    fi
                    
                    # 코드 블록 내부의 내용만 추출
                    if [ "$in_code_block" = true ]; then
                        echo "$line" >> "$pure_test_file"
                    fi
                done < "$temp_output"
                
                # 순수 테스트 파일을 최종 출력 경로로 복사
                if [ -s "$pure_test_file" ]; then
                    cp "$pure_test_file" "$test_output_path"
                    echo -e "${GREEN}✅ $filename ($type_name) 순수 테스트 코드 추출 완료${NC}"
                else
                    echo -e "${YELLOW}⚠️  테스트 코드 추출 실패 - 원본 MD 파일 저장${NC}"
                    cp "$temp_output" "$test_output_path"
                fi
                
                rm -f "$pure_test_file"
            else
                # 단일 파일 출력 (MD 형식이 아닌 경우)
                cp "$temp_output" "$test_output_path"
                echo -e "${GREEN}✅ $filename ($type_name) 단일파일 생성 완료${NC}"
            fi
            
            echo -e "${YELLOW}📁 생성된 테스트: $test_output_path${NC}"
            
            # 테스트 생성 결과 요약
            echo -e "${BLUE}📊 테스트 생성 결과:${NC}"
            local test_lines=$(wc -l < "$test_output_path" 2>/dev/null || echo "0")
            echo -e "${CYAN}  🧪 테스트 파일: $test_output_path (${test_lines}줄)${NC}"
            
            # 테스트 타입 분석
            if grep -q "describe.*Component" "$test_output_path" 2>/dev/null; then
                echo -e "${CYAN}  📱 컴포넌트 테스트: 렌더링, 상호작용, 성능, 접근성${NC}"
            fi
            if grep -q "it.*성능" "$test_output_path" 2>/dev/null; then
                echo -e "${CYAN}  ⚡ 성능 테스트 포함${NC}"
            fi
            if grep -q "vi\.mock\|vi\.fn" "$test_output_path" 2>/dev/null; then
                echo -e "${CYAN}  🎭 Mock 함수 활용${NC}"
            fi
            if grep -q "expect.*toThrow\|expect.*rejects" "$test_output_path" 2>/dev/null; then
                echo -e "${CYAN}  🚨 에러 처리 테스트 포함${NC}"
            fi
            
        else
            echo -e "${RED}❌ $filename ($type_name) 생성 실패${NC}"
        fi
        
        # 파일 간 간격 (API 부하 방지)
        if [ ${#files[@]} -gt 1 ]; then
            echo -e "${BLUE}⏳ 3초 대기 (API 부하 방지)...${NC}"
            sleep 3
        fi
    done
}

# 테스트 관련 도움말
show_test_help() {
    echo ""
    echo -e "${YELLOW}🧪 테스트 생성 및 실행 가이드:${NC}"
    echo ""
    echo -e "${CYAN}1. 테스트 생성 명령어:${NC}"
    echo -e "   ${GREEN}./mcp-auto-run.sh testgen [파일/폴더]${NC}           # 자동 감지"
    echo -e "   ${GREEN}./mcp-auto-run.sh testgen-component [컴포넌트]${NC}   # 컴포넌트 전용"
    echo -e "   ${GREEN}./mcp-auto-run.sh testgen-logic [로직파일]${NC}      # 로직 전용"
    echo ""
    echo -e "${CYAN}2. 지원하는 테스트 타입:${NC}"
    echo -e "   📱 React 컴포넌트: 렌더링, 상호작용, 성능, 접근성"
    echo -e "   🔧 유틸리티 함수: 단위 테스트, 에지 케이스, 성능"
    echo -e "   🔌 API 서비스: HTTP 모킹, 에러 처리, 재시도 로직"
    echo -e "   🏪 상태 관리: 액션, 상태 변화, 비동기 처리"
    echo -e "   🪝 커스텀 훅: 상태 변화, 사이드 이펙트, 의존성"
    echo ""
    echo -e "${CYAN}3. 생성되는 테스트 특징:${NC}"
    echo -e "   ✅ Vitest + React Testing Library 기반"
    echo -e "   ✅ 포괄적 테스트 케이스 (에지 케이스 포함)"
    echo -e "   ✅ Mock 함수 및 테스트 유틸리티 활용"
    echo -e "   ✅ 성능 및 접근성 테스트 포함"
    echo -e "   ✅ 실제 버그 발견 가능한 의미있는 테스트"
    echo ""
    echo -e "${CYAN}4. 테스트 실행 방법:${NC}"
    echo -e "   ${GREEN}# Vitest 사용${NC}"
    echo -e "   npx vitest run                    # 모든 테스트 실행"
    echo -e "   npx vitest --coverage             # 커버리지 포함"
    echo -e "   npx vitest --ui                   # UI 모드"
    echo -e "   npx vitest Header.test.tsx        # 특정 파일만"
    echo ""
    echo -e "   ${GREEN}# Jest 사용${NC}"
    echo -e "   npm test                          # 모든 테스트 실행"
    echo -e "   npm test -- --coverage            # 커버리지 포함"
    echo -e "   npm test -- --watch               # 감시 모드"
    echo -e "   npm test Header.test.tsx          # 특정 파일만"
    echo ""
    echo -e "${CYAN}5. 테스트 설정 확인:${NC}"
    echo -e "   📄 package.json - 테스트 스크립트 및 의존성"
    echo -e "   📄 vitest.config.ts - Vitest 설정"
    echo -e "   📄 jest.config.js - Jest 설정"
    echo -e "   📄 setupTests.ts - 테스트 환경 설정"
    echo ""
    echo -e "${CYAN}6. 예시 명령어:${NC}"
    echo -e "   ${GREEN}# 컴포넌트 테스트 생성${NC}"
    echo -e "   ./mcp-auto-run.sh testgen-component src/components/Button.tsx"
    echo ""
    echo -e "   ${GREEN}# 유틸 함수 테스트 생성${NC}"
    echo -e "   ./mcp-auto-run.sh testgen-logic src/utils/formatDate.ts"
    echo ""
    echo -e "   ${GREEN}# 폴더 전체 테스트 생성${NC}"
    echo -e "   ./mcp-auto-run.sh testgen src/components/ --limit 5"
    echo ""
    echo -e "   ${GREEN}# 드라이런으로 미리 확인${NC}"
    echo -e "   ./mcp-auto-run.sh testgen src/store/ --dry-run"
    echo ""
}

# 메인 실행 로직
main() {
    if [ -z "$TASK" ]; then
        show_help
        exit 1
    fi

    check_prerequisites
    setup_directories
    
    case "$TASK" in
        "performance")
            extract_structure
            copy_code_files
            run_performance_analysis
            ;;
        "refactor")
            extract_structure
            copy_code_files
            run_refactoring
            ;;
        "refactor-utils")
            extract_structure
            copy_code_files
            run_utils_refactoring
            ;;
        "refactor-apis")
            extract_structure
            copy_code_files
            run_apis_refactoring
            ;;
        "refactor-store")
            extract_structure
            copy_code_files
            run_store_refactoring
            ;;
        "refactor-store-zustand")
            extract_structure
            copy_code_files
            run_store_zustand_refactoring
            ;;
        "refactor-store-rtk")
            extract_structure
            copy_code_files
            run_store_rtk_refactoring
            ;;
        "testgen")
            extract_structure
            copy_code_files
            run_testgen
            ;;
        "testgen-component")
            extract_structure
            copy_code_files
            run_testgen_component
            ;;
        "testgen-logic")
            extract_structure
            copy_code_files
            run_testgen_logic
            ;;
        "structure")
            extract_structure
            run_structure_analysis
            ;;
        "migrate")
            extract_structure
            run_migration
            ;;
        "all")
            echo -e "${PURPLE}🚀 전체 작업 실행: 성능분석 → 리팩토링 → 구조분석 → 마이그레이션 (YAML 프롬프트 활용)${NC}"
            echo ""
            
            extract_structure
            copy_code_files
            
            echo -e "${BLUE}📋 1/4: 성능 분석 (YAML)${NC}"
            run_performance_analysis
            
            echo -e "${BLUE}📋 2/4: 리팩토링 (YAML + TypeScript 최적화)${NC}"
            run_refactoring
            
            echo -e "${BLUE}📋 3/4: 구조 분석 (YAML)${NC}"
            run_structure_analysis
            
            echo -e "${BLUE}📋 4/4: 마이그레이션${NC}"
            run_migration
            ;;
        "cleanup")
            cleanup_errors
            ;;
        "quota")
            show_quota_help
            ;;
        "test-help")
            show_test_help
            ;;
        "list")
            echo -e "${BLUE}🔍 사용 가능한 코드 파일 목록:${NC}"
            echo ""
            
            # React 컴포넌트
            local react_files=$(find . -name "*.tsx" -o -name "*.jsx" | grep -E "(components|pages)" | grep -v node_modules | grep -v ".test." | grep -v ".spec.")
            if [ -n "$react_files" ]; then
                echo -e "${CYAN}📱 React 컴포넌트:${NC}"
                echo "$react_files" | while read file; do
                    echo -e "  📄 $file"
                done
                echo ""
            fi
            
            # API 서비스
            local api_files=$(find . -name "*.ts" -o -name "*.js" | grep -E "(api|service)" | grep -v node_modules | grep -v ".test." | grep -v ".spec." | grep -v ".d.ts")
            if [ -n "$api_files" ]; then
                echo -e "${CYAN}🔌 API 서비스:${NC}"
                echo "$api_files" | while read file; do
                    echo -e "  📄 $file"
                done
                echo ""
            fi
            
            # 유틸리티
            local util_files=$(find . -name "*.ts" -o -name "*.js" | grep -E "(util|helper)" | grep -v node_modules | grep -v ".test." | grep -v ".spec." | grep -v ".d.ts")
            if [ -n "$util_files" ]; then
                echo -e "${CYAN}🛠️ 유틸리티:${NC}"
                echo "$util_files" | while read file; do
                    echo -e "  📄 $file"
                done
                echo ""
            fi
            
            # 상태 관리
            local store_files=$(find . -name "*.ts" -o -name "*.tsx" | grep -E "(store|context|state)" | grep -v node_modules | grep -v ".test." | grep -v ".spec." | grep -v ".d.ts")
            if [ -n "$store_files" ]; then
                echo -e "${CYAN}🏪 상태 관리:${NC}"
                echo "$store_files" | while read file; do
                    echo -e "  📄 $file"
                done
                echo ""
            fi
            
            # 기타 TypeScript/JavaScript 파일
            local other_files=$(find . -name "*.ts" -o -name "*.js" | grep -E "(src|app)" | grep -v -E "(components|pages|api|service|util|helper|store|context|state)" | grep -v node_modules | grep -v ".test." | grep -v ".spec." | grep -v ".d.ts" | head -10)
            if [ -n "$other_files" ]; then
                echo -e "${CYAN}🔧 기타 코드 파일:${NC}"
                echo "$other_files" | while read file; do
                    echo -e "  📄 $file"
                done
                echo ""
            fi
            
            echo -e "${YELLOW}💡 사용법:${NC}"
            echo -e "${CYAN}  ./mcp-auto-run.sh refactor [파일경로]     # 단일 파일 리팩토링${NC}"
            echo -e "${CYAN}  ./mcp-auto-run.sh refactor [폴더경로]     # 폴더 내 모든 파일 리팩토링${NC}"
            echo -e "${CYAN}  ./mcp-auto-run.sh testgen [파일경로]      # 자동 테스트 생성${NC}"
            echo -e "${CYAN}  ./mcp-auto-run.sh testgen-component [파일] # 컴포넌트 테스트 생성${NC}"
            echo -e "${CYAN}  ./mcp-auto-run.sh testgen-logic [파일]     # 로직 테스트 생성${NC}"
            echo -e "${CYAN}  ./mcp-auto-run.sh performance [파일경로]  # 성능 분석${NC}"
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            echo -e "${RED}❌ 알 수 없는 작업: $TASK${NC}"
            show_help
            exit 1
            ;;
    esac
    
    show_results
}

# 스크립트 실행
main "$@"