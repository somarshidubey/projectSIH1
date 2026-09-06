from fpdf import FPDF
import os

class StatsPDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 11)
        self.cell(0, 8, 'Ministry of Statistics and Programme Implementation', align='C', new_x='LMARGIN', new_y='NEXT')
        self.set_font('Helvetica', '', 9)
        self.cell(0, 6, 'Official Training Material - Statistical Methods & National Accounts', align='C', new_x='LMARGIN', new_y='NEXT')
        self.line(10, self.get_y() + 2, 200, self.get_y() + 2)
        self.ln(6)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}}', align='C')

    def chapter_title(self, title):
        self.set_font('Helvetica', 'B', 13)
        self.set_fill_color(99, 102, 241)
        self.set_text_color(255, 255, 255)
        self.cell(0, 10, f'  {title}', fill=True, new_x='LMARGIN', new_y='NEXT')
        self.set_text_color(0, 0, 0)
        self.ln(4)

    def section_title(self, title):
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(99, 102, 241)
        self.cell(0, 8, title, new_x='LMARGIN', new_y='NEXT')
        self.set_text_color(0, 0, 0)
        self.ln(2)

    def body_text(self, text):
        self.set_font('Helvetica', '', 10)
        self.multi_cell(0, 5.5, text)
        self.ln(2)

    def bullet(self, text):
        self.set_font('Helvetica', '', 10)
        x = self.get_x()
        self.cell(8, 5.5, '>')
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def table_row(self, cols, widths, bold=False):
        style = 'B' if bold else ''
        self.set_font('Helvetica', style, 9)
        for i, (col, w) in enumerate(zip(cols, widths)):
            self.cell(w, 7, col, border=1, align='C' if i > 0 else 'L')
        self.ln()

pdf = StatsPDF()
pdf.alias_nb_pages()
pdf.set_auto_page_break(auto=True, margin=20)
pdf.add_page()

# Chapter 1: Fundamentals of Statistics
pdf.chapter_title('Chapter 1: Fundamentals of Statistics')

pdf.section_title('1.1 Measures of Central Tendency')
pdf.body_text(
    'Measures of central tendency describe the center or typical value of a dataset. '
    'The three main measures are the mean, median, and mode.'
)
pdf.body_text(
    'The arithmetic mean is calculated by summing all values and dividing by the count. '
    'For a dataset x1, x2, ..., xn, the mean is: x-bar = (1/n) * sum(xi). '
    'The mean is sensitive to outliers, which can significantly distort the value.'
)
pdf.body_text(
    'The median is the middle value when data is arranged in ascending order. '
    'For an even number of observations, the median is the average of the two middle values. '
    'The median is robust to outliers and is preferred for skewed distributions.'
)
pdf.body_text(
    'The mode is the most frequently occurring value in a dataset. A dataset can be '
    'unimodal, bimodal, or multimodal. The mode is the only measure applicable to nominal data.'
)

pdf.section_title('1.2 Measures of Dispersion')
pdf.body_text(
    'Measures of dispersion quantify the spread or variability of data. '
    'Common measures include range, variance, and standard deviation.'
)
pdf.body_text(
    'The range is the difference between the maximum and minimum values. '
    'It is simple but sensitive to outliers. The interquartile range (IQR = Q3 - Q1) '
    'is more robust, covering the middle 50% of the data.'
)
pdf.body_text(
    'Variance measures the average squared deviation from the mean. '
    'For a population: sigma^2 = (1/N) * sum((xi - mu)^2). '
    'For a sample: s^2 = (1/(n-1)) * sum((xi - x-bar)^2). '
    'The denominator (n-1) provides an unbiased estimate.'
)
pdf.body_text(
    'The standard deviation is the square root of variance, expressed in the same units as the data. '
    'It is the most commonly used measure of dispersion. For a normal distribution, '
    'approximately 68% of data falls within one standard deviation of the mean.'
)

pdf.section_title('1.3 Probability Distributions')
pdf.body_text(
    'A probability distribution describes the likelihood of different outcomes. '
    'The two main types are discrete and continuous distributions.'
)
pdf.body_text(
    'The Binomial distribution models the number of successes in n independent trials. '
    'P(X = k) = C(n,k) * p^k * (1-p)^(n-k), where p is the probability of success. '
    'It is used for binary outcomes like pass/fail or yes/no.'
)
pdf.body_text(
    'The Normal (Gaussian) distribution is the most important continuous distribution. '
    'Its probability density function is: f(x) = (1/(sigma*sqrt(2*pi))) * exp(-(x-mu)^2/(2*sigma^2)). '
    'The Central Limit Theorem states that the sampling distribution of the mean '
    'approaches a normal distribution as sample size increases, regardless of the population distribution.'
)
pdf.body_text(
    'The Poisson distribution models the number of events in a fixed interval. '
    'P(X = k) = (lambda^k * e^(-lambda)) / k!, where lambda is the average rate. '
    'It is used for count data such as number of arrivals or defects.'
)

# Chapter 2: National Accounts Statistics
pdf.add_page()
pdf.chapter_title('Chapter 2: National Accounts Statistics')

pdf.section_title('2.1 GDP Measurement Approaches')
pdf.body_text(
    'Gross Domestic Product (GDP) measures the total monetary value of all finished goods '
    'and services produced within a country during a specific period. India uses three '
    'approaches to measure GDP:'
)
pdf.body_text(
    'Production Approach: GDP is calculated as the sum of Gross Value Added (GVA) across '
    'all sectors. GVA = Output - Intermediate Consumption. The three sectors are: '
    'Agriculture & Allied Activities, Industry (Manufacturing, Mining, Construction), '
    'and Services (Trade, Transport, Finance, etc.).'
)
pdf.body_text(
    'Expenditure Approach: GDP = C + I + G + (X - M), where C is private consumption, '
    'I is investment, G is government spending, and (X-M) is net exports. '
    'This approach provides insight into the demand-side composition of the economy.'
)
pdf.body_text(
    'Income Approach: GDP is the sum of all incomes earned in production: '
    'GDP = Compensation of employees + Operating surplus + Mixed income + Taxes on production '
    'minus subsidies. This approach shows how GDP is distributed among factors of production.'
)

pdf.section_title('2.2 Base Year and Chain-Linking')
pdf.body_text(
    'GDP estimates require a base year for constant price calculations. India shifted from '
    'the fixed-base year method to chain-linking in 2015, with 2011-12 as the base year. '
    'Chain-linking uses annual growth rates to avoid the distortions caused by using a '
    'single base year for extended periods.'
)
pdf.body_text(
    'Real GDP (at constant prices) reflects volume changes by removing the effect of price '
    'inflation. Nominal GDP (at current prices) includes both volume and price changes. '
    'The GDP deflator (Nominal GDP / Real GDP * 100) measures the overall price level.'
)

pdf.section_title('2.3 GVA by Sector')
pdf.body_text(
    'The Gross Value Added at Basic Prices is the primary measure used in India. '
    'The sectors and their approximate shares are:'
)

widths = [80, 35, 35, 40]
pdf.table_row(['Sector', 'GVA Share', 'Growth Rate', 'Employment'], widths, bold=True)
pdf.table_row(['Agriculture', '18-20%', '3-4%', '42%'], widths)
pdf.table_row(['Industry', '25-27%', '5-7%', '25%'], widths)
pdf.table_row(['Services', '53-55%', '7-9%', '33%'], widths)
pdf.ln(4)

pdf.body_text(
    'The Services sector dominates India\'s GDP and has been the fastest growing sector. '
    'Within services, financial services, IT, and trade contribute significantly. '
    'The Agriculture sector, while having a smaller GDP share, employs the majority of '
    'the workforce, highlighting structural transformation challenges.'
)

# Chapter 3: Sample Registration System
pdf.add_page()
pdf.chapter_title('Chapter 3: Sample Registration System (SRS)')

pdf.section_title('3.1 Overview of SRS')
pdf.body_text(
    'The Sample Registration System (SRS) is a large-scale demographic survey conducted '
    'by the Registrar General of India. It provides annual estimates of fertility and '
    'mortality indicators at the national and state levels.'
)
pdf.body_text(
    'SRS uses a dual record system where data is collected independently through: '
    '(1) a continuous enumeration of births and deaths by resident enumerators, and '
    '(2) a six-monthly survey to cross-check and update the continuous records. '
    'This dual coverage helps identify under-reporting and improves data quality.'
)

pdf.section_title('3.2 Key Indicators')
pdf.body_text(
    'Crude Birth Rate (CBR): Number of live births per 1,000 population in a year. '
    'CBR = (Live births / Mid-year population) * 1,000. India\'s CBR has declined from '
    'around 38 in 1981 to approximately 17 in 2020.'
)
pdf.body_text(
    'Crude Death Rate (CDR): Number of deaths per 1,000 population in a year. '
    'CDR = (Deaths / Mid-year population) * 1,000. India\'s CDR has declined from '
    'around 15 in 1981 to approximately 7 in 2020.'
)
pdf.body_text(
    'Infant Mortality Rate (IMR): Number of deaths of children under one year of age '
    'per 1,000 live births. IMR = (Infant deaths / Live births) * 1,000. '
    'India has shown significant improvement, declining from 80 in 1990 to around 28 in 2020.'
)
pdf.body_text(
    'Total Fertility Rate (TFR): Average number of children a woman would have during '
    'her reproductive years. TFR = Sum of age-specific fertility rates * 5. '
    'India\'s TFR has declined from 3.4 in 1992-93 to approximately 2.0 in 2020.'
)
pdf.body_text(
    'Maternal Mortality Ratio (MMR): Number of maternal deaths per 100,000 live births. '
    'India\'s MMR has declined from 556 in 1990 to around 97 in 2018-20.'
)

pdf.section_title('3.3 SRS Sampling Framework')
pdf.body_text(
    'SRS covers a sample of about 1.5 million households across India, drawn using '
    'a multi-stage stratified random sampling design. The primary sampling units are '
    'Census villages in rural areas and wards in urban areas. The sample is designed '
    'to provide reliable estimates for major states and union territories.'
)

# Chapter 4: Data Collection Methods
pdf.add_page()
pdf.chapter_title('Chapter 4: Modern Data Collection Methods')

pdf.section_title('4.1 Traditional Survey Methods')
pdf.body_text(
    'Face-to-face interviews remain the primary data collection method in India. '
    'The National Sample Survey Office (NSSO) conducts large-scale sample surveys '
    'covering various socio-economic topics. Key features include:'
)
pdf.bullet('Stratified multi-stage sampling design')
pdf.bullet('CCH (Central, State, District) framework for representation')
pdf.bullet('Schedule-based data collection with trained investigators')
pdf.bullet('Post-enumeration surveys for quality assessment')
pdf.ln(2)

pdf.section_title('4.2 Computer Assisted Personal Interviewing (CAPI)')
pdf.body_text(
    'CAPI replaces paper-based questionnaires with tablet computers or smartphones. '
    'Benefits include real-time data validation, reduced data entry errors, GPS '
    'tagging of interviews, and faster data processing. The NSSO has increasingly '
    'adopted CAPI for its surveys.'
)

pdf.section_title('4.3 IoT-Based Data Collection')
pdf.body_text(
    'Internet of Things (IoT) devices offer new possibilities for automated data '
    'collection in official statistics:'
)
pdf.bullet('Smart meters for real-time electricity consumption data')
pdf.bullet('Weather stations for automated climate data collection')
pdf.bullet('Traffic sensors for transportation statistics')
pdf.bullet('Satellite imagery with AI for agricultural crop estimation')
pdf.bullet('Mobile phone data for migration and mobility studies')
pdf.ln(2)

pdf.section_title('4.4 Data Quality Framework')
pdf.body_text(
    'Data quality in official statistics is assessed across multiple dimensions: '
    'accuracy (closeness to true value), completeness (coverage of target population), '
    'timeliness (availability when needed), consistency (coherence across sources), '
    'and accessibility (ease of understanding and use).'
)

# Chapter 5: Data Dissemination
pdf.chapter_title('Chapter 5: Data Dissemination Standards')

pdf.section_title('5.1 SDDS Compliance')
pdf.body_text(
    'India is a signatory to the IMF\'s Special Data Dissemination Standard (SDDS). '
    'SDDS requires countries to publish data according to specific metadata, '
    'coverage, periodicity, and timeliness requirements. Key SDDS components include:'
)
pdf.bullet('Advance release calendars for major economic indicators')
pdf.bullet('National accounts, price, and labor force data at specified periodicity')
pdf.bullet('Metadata on data sources and compilation methods')
pdf.bullet('Quality assessment frameworks')
pdf.ln(2)

pdf.section_title('5.2 SDMX Implementation')
pdf.body_text(
    'SDMX (Statistical Data and Metadata Exchange) is an ISO standard for '
    'sharing statistical data and metadata. India has adopted SDMX for '
    'disseminating data through the Ministry of Statistics portal. Benefits include:'
)
pdf.bullet('Standardized data formats for interoperability')
pdf.bullet('Automated data exchange between agencies')
pdf.bullet('Machine-readable metadata for data integration')
pdf.bullet('Support for international reporting requirements')
pdf.ln(2)

pdf.section_title('5.3 Open Data Initiative')
pdf.body_text(
    'The Indian government has embraced open data through data.gov.in, '
    'providing public access to government datasets. This promotes transparency, '
    'enables research, and supports evidence-based policymaking. '
    'Key datasets include national accounts, price indices, employment statistics, '
    'and social indicators.'
)

# Save
output_path = os.path.join(os.path.dirname(__file__), 'sample_statistics_material.pdf')
pdf.output(output_path)
print(f'PDF created: {output_path}')
