import Link from 'next/link';
import ExpensesList from '@/components/ExpensesList';
import MonthReportMonthSelect from '@/components/MonthReportMonthSelect';
import {prisma} from '@/lib/prisma';
import {getMonthlyReport, getPeriodSummary} from '@/lib/reports';
import {monthName} from '@/lib/money';
import {requireWorkspace} from '@/lib/auth';
import {orderBanks, orderExpenseCategories, orderPaymentMethods} from '@/lib/workspace-defaults';

function capitalize(value: string) {
    return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

function euroInt(value: number | string | null | undefined) {
    const n = Number(value ?? 0);
    return new Intl.NumberFormat('it-IT', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0}).format(n);
}

function safeReturnTo(value: string | string[] | undefined) {
    const raw = Array.isArray(value) ? value[0] : value;
    return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

const monthNavLabels = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const monthSelectLabels = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

export default async function MonthPage({params, searchParams}: { params: Promise<{ year: string; month: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
    const current = await requireWorkspace('/months');
    const resolvedParams = await params;
    const query = (await searchParams) ?? {};
    const year = Number(resolvedParams.year);
    const month = Number(resolvedParams.month);
    const backHref = safeReturnTo(query.returnTo);
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const [report, fiscalTotals, categories, banks, paymentMethods, suppliers] = await Promise.all([
        getMonthlyReport(year, month, current.workspace.id),
        getPeriodSummary([{year, month}], {workspaceId: current.workspace.id}),
        prisma.expenseCategory.findMany({where: {workspaceId: current.workspace.id}, orderBy: {id: 'asc'}}),
        prisma.bank.findMany({where: {workspaceId: current.workspace.id}}),
        prisma.paymentMethod.findMany({where: {workspaceId: current.workspace.id}}),
        prisma.supplier.findMany({
            where: {workspaceId: current.workspace.id},
            orderBy: {businessName: 'asc'},
            take: 100
        })
    ]);
    const orderedCategories = orderExpenseCategories(categories);
    const orderedBanks = orderBanks(banks);
    const expensePaymentMethods = orderPaymentMethods(paymentMethods, 'EXPENSE');
    const currentMonthHref = `/months/${year}/${month}?returnTo=${encodeURIComponent(backHref)}`;
    const returnTo = encodeURIComponent(currentMonthHref);
    const mobileExpenses = [...report.expenses].sort((a, b) => {
        const dateA = a.receivedDate ? new Date(a.receivedDate).getTime() : 0;
        const dateB = b.receivedDate ? new Date(b.receivedDate).getTime() : 0;
        return dateB - dateA || b.id - a.id;
    });
    const monthNavOptions = monthNavLabels.map((label, index) => {
        const navMonth = index + 1;
        const href = `/months/${year}/${navMonth}?returnTo=${encodeURIComponent(backHref)}`;
        return {
            label,
            selectLabel: monthSelectLabels[index],
            href,
            month: navMonth,
            disabled: year > currentYear || (year === currentYear && navMonth > currentMonth)
        };
    });

    return <div className="grid month-report-page">
        <section className="month-report-header">
            <div className="flex gap-6 justify-between">
                <span>
                    <Link className="btn btn-xs btn-default" href={backHref}>
                        ↩ <span className="hidden-mobile"> Indietro</span>
                    </Link>
                </span>
                <MonthReportMonthSelect options={monthNavOptions} value={currentMonthHref}/>
                <div className="month-report-month-nav" aria-label="Seleziona mese">
                    {monthNavOptions.map((option) => {
                        const isActive = option.month === month;
                        return option.disabled
                            ? <button className="btn-xs btn-action month-report-month-button" type="button" disabled key={option.month}>{option.label}</button>
                            : <Link className={isActive ? 'btn-xs btn-action btn-active month-report-month-button' : 'btn-xs btn-action month-report-month-button'} href={option.href} key={option.month}>{option.label}</Link>;
                    })}
                </div>
            </div>

            <div className="month-report-title">
                <p>Dettaglio mensile</p>
                <h2>{capitalize(monthName(month))} {year}</h2>
            </div>
            <div className="grid grid-4 month-report-metrics">
                <div className="month-report-value"><span>Entrate</span><strong
                    className="month-report-positive">{euroInt(report.totals.totalRevenue)}</strong></div>
                <div className="month-report-value">
                    <span>Uscite</span><strong>{euroInt(report.totals.totalExpenses)}</strong></div>
                <div className="month-report-value"><span>Utile lordo</span><strong
                    className="month-report-positive">{euroInt(report.totals.grossProfit)}</strong></div>
                <div className="month-report-value"><span>Netto previsto</span><strong
                    className="month-report-positive">{euroInt(report.totals.estimatedNetProfit)}</strong></div>
            </div>
        </section>

        <section className="month-report-section">
            <h3>Indicatori fiscali</h3>
            <div className="month-report-fiscal-metrics">
                <div className="month-report-value"><span>Utile fiscale</span><strong
                    className="month-report-positive">{euroInt(fiscalTotals.utileFiscale)}</strong></div>
                <div className="month-report-value"><span>Fatture non ricevute</span><strong
                    className="month-report-warning">{fiscalTotals.fattureNonRicevute}</strong></div>
                <div className="month-report-value"><span>Fatture da inviare</span><strong
                    className="month-report-warning">{fiscalTotals.fattureNonInviate}</strong></div>
                <div className="month-report-value"><span>Uscite non fiscali</span><strong
                    className="month-report-muted-value">{euroInt(fiscalTotals.usciteNonFiscali)}</strong></div>
            </div>
        </section>

        <div className="grid grid-2 month-report-panels">
            <section className="card month-report-section"><h3>IVA</h3>
                <table>
                    <tbody>
                    <tr>
                        <td>IVA vendite</td>
                        <td>{euroInt(report.totals.vatToPay)}</td>
                    </tr>
                    <tr>
                        <td>IVA spese</td>
                        <td>{euroInt(report.totals.paidVat)}</td>
                    </tr>
                    <tr>
                        <td>IVA da versare</td>
                        <td>{euroInt(report.totals.remainingVat)}</td>
                    </tr>
                    </tbody>
                </table>
            </section>
            <section className="card month-report-section"><h3>Entrate</h3>
                <table>
                    <tbody>
                    <tr>
                        <td>Totale incassi</td>
                        <td>{euroInt(report.totals.totalRevenue)}</td>
                    </tr>
                    <tr>
                        <td>Incassi fiscali</td>
                        <td>{euroInt(fiscalTotals.incassoFiscale)}</td>
                    </tr>
                    <tr>
                        <td>Incassi non fiscali</td>
                        <td>{euroInt(fiscalTotals.incassoNonFiscale)}</td>
                    </tr>
                    </tbody>
                </table>
            </section>
        </div>
        <section className="month-report-section month-report-expenses">
            <div className="month-report-section-heading">
                <h3>Spese del mese</h3>
                <div className="month-report-value month-report-inline-total"><span>Spese non saldate</span><strong
                    className="money-warning">{euroInt(fiscalTotals.nonSaldato)}</strong></div>
            </div>
            <ExpensesList
                expenses={report.expenses}
                mobileExpenses={mobileExpenses}
                returnTo={returnTo}
                showSupplierColumn
                selectable
                formId="monthExpenseBulkForm"
                categories={orderedCategories.map(category => ({
                    id: category.id,
                    code: category.code,
                    name: category.name,
                    icon: category.icon
                }))}
                banks={orderedBanks.map(bank => ({id: bank.id, name: bank.name, isFallback: bank.isFallback}))}
                paymentMethods={expensePaymentMethods.map(method => ({
                    id: method.id,
                    name: method.name,
                    kind: method.kind,
                    isFallback: method.isFallback
                }))}
                suppliers={suppliers.map(supplier => ({
                    id: supplier.id,
                    businessName: supplier.businessName,
                    alias: supplier.alias,
                    email: supplier.email,
                    vatNumber: supplier.vatNumber,
                    iban: supplier.iban,
                    pec: supplier.pec,
                    taxCodeSdi: supplier.taxCodeSdi,
                    internalNotes: supplier.internalNotes
                }))}
                mobileLabel="Lista spese del mese mobile"
                emptyMessage="Nessuna spesa trovata per questo mese."
            />
        </section>
    </div>;
}
